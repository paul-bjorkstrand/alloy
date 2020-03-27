import { t, ClientFunction } from "testcafe";
import createNetworkLogger from "../helpers/networkLogger";
import getResponseBody from "../helpers/networkLogger/getResponseBody";
import fixtureFactory from "../helpers/fixtureFactory";
import cookies from "../helpers/cookies";
import alloyEvent from "../helpers/alloyEvent";
import getConsentCookieName from "../helpers/getConsentCookieName";
import createResponse from "../../../src/core/createResponse";

const networkLogger = createNetworkLogger();

fixtureFactory({
  title: "C14409 - Consenting to no purposes should be persisted.",
  requestHooks: [networkLogger.edgeEndpointLogs]
});

test.meta({
  ID: "C14409",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

const setConsentToOut = ClientFunction(() => {
  return window.alloy("setConsent", { general: "out" });
});

test("C14409 - Consenting to no purposes should be persisted.", async () => {
  const imsOrgId = "53A16ACB5CC1D3760A495C99@AdobeOrg";
  await cookies.clear();

  const configure = await alloyEvent("configure", {
    configId: "9999999",
    orgId: imsOrgId,
    debugEnabled: true,
    idMigrationEnabled: false
  });

  await configure.promise;

  // send alloy event
  const event1 = await alloyEvent({
    viewStart: true
  });

  // apply user consent
  await setConsentToOut();

  await event1.promise;

  const cookieName = getConsentCookieName(imsOrgId);

  const consentCheck = await cookies.get(cookieName);

  await t.expect(consentCheck).eql("general=out");

  // test konductor response
  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);
  await t
    .expect(networkLogger.edgeEndpointLogs.requests[0].response.statusCode)
    .eql(200);

  const request = JSON.parse(
    getResponseBody(networkLogger.edgeEndpointLogs.requests[0])
  );

  // read state:store handles from response (i.e. 'set a cookie')
  await t.expect("handle" in request).ok();
  await t.expect(request.handle.length).gt(0);

  const storePayloads = createResponse(request).getPayloadsByType(
    "state:store"
  );
  const cookiesToSet = storePayloads.reduce((memo, storePayload) => {
    memo[storePayload.key] = storePayload;
    return memo;
  }, {});

  // Reload and reconfigure alloy
  // [TODO] Navigate to a different subdomain when it is available
  // https://github.com/DevExpress/testcafe/blob/a4f6a4ac3627ebeb29b344ed3a1793627dd87909/docs/articles/documentation/test-api/actions/navigate.md
  await t.eval(() => document.location.reload());

  const reconfigure = await alloyEvent("configure", {
    configId: "9999999",
    orgId: imsOrgId,
    debugEnabled: true,
    idMigrationEnabled: false
  });

  await reconfigure.promise;

  const errorMessage = await t.eval(() =>
    window
      .alloy("event", { data: { a: 1 } })
      .then(() => undefined, e => e.message)
  );

  // expect that konductor cookie handle matches cookie name
  await t.expect(cookieName in cookiesToSet).ok();

  await t.expect(errorMessage).ok("Expected the event command to be rejected");
  await t.expect(errorMessage).contains("The user declined consent.");

  // expect that the cookie max age is greater than 0
  await t.expect("maxAge" in cookiesToSet[cookieName]).ok();
  await t.expect(cookiesToSet[cookieName].maxAge).gt(0);
});

/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

export default ({
  options,
  componentCreators,
  createConfig,
  createConfigValidator,
  coreConfigValidators,
  logger,
  setDebugEnabled,
  setErrorsEnabled
}) => {
  const config = createConfig(options);
  const configValidator = createConfigValidator(config);
  configValidator.addValidators(coreConfigValidators);
  componentCreators.forEach(createComponent => {
    const { configValidators } = createComponent;
    configValidator.addValidators(configValidators);
  });
  configValidator.validate();
  setErrorsEnabled(config.errorsEnabled);
  setDebugEnabled(config.debugEnabled, { fromConfig: true });
  // toJson is expensive so we short circuit if logging is disabled
  if (logger.enabled) {
    logger.log("Computed configuration:", config);
  }
  return config;
};
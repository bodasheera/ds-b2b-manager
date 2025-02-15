const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const log4js = require('log4js');
const copy = require('recursive-copy');

const config = require('../../config')
// const schemaUtils = require('@appveen/utils').schemaUtils;
const codeGen = require('./generators/code.generator');
// const fileUtilsGenerator = require('./generators/file.utils');

const logger = log4js.getLogger(global.loggerName);

async function createProject(flowJSON) {
  try {
    if (!flowJSON.port) {
      flowJSON.port = 31000;
    }
    const folderPath = path.join(process.cwd(), 'generatedFlows', flowJSON._id);
    logger.info('Creating Project Folder:', folderPath);

    mkdirp.sync(folderPath);
    // mkdirp.sync(path.join(folderPath, 'schemas'));
    // if (fs.existsSync(path.join(folderPath, 'routes'))) {
    //   fs.rmdirSync(path.join(folderPath, 'routes'), { recursive: true });
    // }
    // if (fs.existsSync(path.join(folderPath, 'utils'))) {
    //   fs.rmdirSync(path.join(folderPath, 'utils'), { recursive: true });
    // }
    // mkdirp.sync(path.join(folderPath, 'routes'));
    // mkdirp.sync(path.join(folderPath, 'utils'));

    // Object.keys(flowJSON.structures).forEach(key => {
    //   const structure = flowJSON.structures[key].structure;
    //   fs.writeFileSync(path.join(folderPath, 'schemas', `${key}.schema.json`), JSON.stringify(schemaUtils.convertToJSONSchema(structure)));
    // });
    if (!config.isK8sEnv()) {
      let baseImagePath;
      if (process.cwd().indexOf('ds-flows') > -1) {
        baseImagePath = path.join(process.cwd());
      } else {
        baseImagePath = path.join(process.cwd(), '../ds-b2b-base');
      }
      fs.copyFileSync(path.join(baseImagePath, 'package.json'), path.join(folderPath, 'package.json'));
      fs.copyFileSync(path.join(baseImagePath, 'package-lock.json'), path.join(folderPath, 'package-lock.json'));
      fs.copyFileSync(path.join(baseImagePath, 'config.js'), path.join(folderPath, 'config.js'));
      fs.copyFileSync(path.join(baseImagePath, 'app.js'), path.join(folderPath, 'app.js'));
      fs.copyFileSync(path.join(baseImagePath, 'Dockerfile'), path.join(folderPath, 'Dockerfile'));
      fs.copyFileSync(path.join(baseImagePath, 'db-factory.js'), path.join(folderPath, 'db-factory.js'));
      fs.copyFileSync(path.join(baseImagePath, 'lib.middlewares.js'), path.join(folderPath, 'lib.middlewares.js'));
      fs.copyFileSync(path.join(baseImagePath, 'http-client.js'), path.join(folderPath, 'http-client.js'));
      fs.copyFileSync(path.join(baseImagePath, 'schema.utils.js'), path.join(folderPath, 'schema.utils.js'));
      fs.copyFileSync(path.join(baseImagePath, 'state.utils.js'), path.join(folderPath, 'state.utils.js'));

      // fs.copyFileSync(path.join(baseImagePath, 'utils', 'flow.utils.js'), path.join(folderPath, 'utils', 'flow.utils.js'),);
      // const cpUtils = await copy(path.join(baseImagePath, 'utils'), path.join(folderPath, 'utils'));
      // logger.info('Copied utils', cpUtils ? cpUtils.length : 0);
      // const cpRoutes = await copy(path.join(baseImagePath, 'routes'), path.join(folderPath, 'routes'));
      // logger.info('Copied routes', cpRoutes ? cpRoutes.length : 0);
    }

    fs.writeFileSync(path.join(folderPath, `route.js`), codeGen.generateCode(flowJSON));
    fs.writeFileSync(path.join(folderPath, `stage.utils.js`), codeGen.generateStages(flowJSON));
    // fs.writeFileSync(path.join(folderPath, `file.utils.js`), fileUtilsGenerator.getContent(flowJSON));
    fs.writeFileSync(path.join(folderPath, 'Dockerfile'), getDockerFile(config.imageTag, flowJSON.port, flowJSON));
    fs.writeFileSync(path.join(folderPath, 'flow.json'), JSON.stringify(flowJSON));
    fs.writeFileSync(path.join(folderPath, '.env'), getEnvFile(config.release, flowJSON.port, flowJSON));

    logger.info('Project Folder Created!');
  } catch (e) {
    logger.error('Project Folder Error!', e);
  }
}

let dockerRegistryType = process.env.DOCKER_REGISTRY_TYPE ? process.env.DOCKER_REGISTRY_TYPE : '';
if (dockerRegistryType.length > 0) dockerRegistryType = dockerRegistryType.toUpperCase();

let dockerReg = process.env.DOCKER_REGISTRY_SERVER ? process.env.DOCKER_REGISTRY_SERVER : '';
if (dockerReg.length > 0 && !dockerReg.endsWith('/') && dockerRegistryType != 'ECR') dockerReg += '/';


function getDockerFile(release, port, flowData) {
  let base = `${dockerReg}data.stack:b2b.base.${process.env.IMAGE_TAG}`;
  if (dockerRegistryType == 'ECR') base = `${dockerReg}:data.stack.b2b.base.${process.env.IMAGE_TAG}`;
  logger.debug(`Base image :: ${base}`);
  return `
    FROM ${base}

    WORKDIR /app

    COPY . .

    ENV NODE_ENV="production"
    ENV DATA_STACK_NAMESPACE="${config.DATA_STACK_NAMESPACE}"
    ENV DATA_STACK_APP="${flowData.app}"
    ENV DATA_STACK_FLOW_NAMESPACE="${flowData.namespace}"
    ENV DATA_STACK_FLOW_ID="${flowData._id}"
    ENV DATA_STACK_FLOW_NAME="${flowData.name}"
    ENV DATA_STACK_FLOW_VERSION="${flowData.version}"
    ENV DATA_STACK_DEPLOYMENT_NAME="${flowData.deploymentName}"
    ENV RELEASE="${release}"
    ENV PORT="${port}"
    ENV IMAGE_TAG="${flowData._id}:${flowData.version}"
    ENV DATA_DB="${config.dataStackNS}-${flowData.appName}"

    EXPOSE ${port}

    CMD [ "node", "app.js" ]
  `
}


function getEnvFile(release, port, flowData) {
  return `
    DATA_STACK_NAMESPACE="${config.DATA_STACK_NAMESPACE}"
    DATA_STACK_APP="${flowData.app}"
    DATA_STACK_FLOW_NAMESPACE="${flowData.namespace}"
    DATA_STACK_FLOW_ID="${flowData._id}"
    DATA_STACK_FLOW_NAME="${flowData.name}"
    DATA_STACK_FLOW_VERSION="${flowData.version}"
    DATA_STACK_DEPLOYMENT_NAME="${flowData.deploymentName}"
    RELEASE="${release}"
    PORT="${port}"
    ENV IMAGE_TAG="${flowData._id}:${flowData.version}"
    DATA_DB="${config.dataStackNS}-${flowData.appName}"
    LOG_LEVEL="debug"
  `
}


module.exports.createProject = createProject;

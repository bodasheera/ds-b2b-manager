const mongoose = require('mongoose');
const log4js = require('log4js');

const config = require('./config');
const models = require('./models');
const queue = require('./queue');

const LOGGER_NAME = config.isK8sEnv() ? `[${config.hostname}] [B2B-MANAGER v${config.imageTag}]` : `[B2B-MANAGER v${config.imageTag}]`
const logger = log4js.getLogger(LOGGER_NAME);
logger.level = process.env.LOG_LEVEL || 'info';
global.loggerName = LOGGER_NAME;

// let baseImageVersion = require('./package.json').version;
// const LOGGER_NAME = config.isK8sEnv() ? `[${config.appNamespace}] [${config.hostname}] [${config.serviceName} v${config.serviceVersion}]` : `[${config.serviceName} v${config.serviceVersion}]`

// For threads to pick txnId and user headers
global.userHeader = 'user';
global.txnIdHeader = 'txnId';
global.trueBooleanValues = ['y', 'yes', 'true', '1'];
global.falseBooleanValues = ['n', 'no', 'false', '0'];


const appcenterCon = mongoose.createConnection(config.mongoUrl, config.mongoAppCenterOptions);
appcenterCon.on('connecting', () => { logger.info(` *** Appcenter DB CONNECTING *** `); });
appcenterCon.on('disconnected', () => { logger.error(` *** Appcenter DB LOST CONNECTION *** `); });
appcenterCon.on('reconnect', () => { logger.info(` *** Appcenter DB RECONNECTED *** `); });
appcenterCon.on('connected', () => { logger.info(`Connected to Appcenter DB DB`); });
appcenterCon.on('reconnectFailed', () => { logger.error(` *** Appcenter DB FAILED TO RECONNECT *** `); });
global.appcenterCon = appcenterCon;

const logsDB = mongoose.createConnection(config.mongoLogUrl, config.mongoLogsOptions);
logsDB.on('connecting', () => { logger.info(` *** ${config.logsDB} CONNECTING *** `); });
logsDB.on('disconnected', () => { logger.error(` *** ${config.logsDB} LOST CONNECTION *** `); });
logsDB.on('reconnect', () => { logger.info(` *** ${config.logsDB} RECONNECTED *** `); });
logsDB.on('connected', () => { logger.info(`Connected to ${config.logsDB} DB`); });
logsDB.on('reconnectFailed', () => { logger.error(` *** ${config.logsDB} FAILED TO RECONNECT *** `); });
global.logsDB = logsDB;

mongoose.connect(config.mongoAuthorUrl, config.mongoAuthorOptions).then(client => {
	global.authorDB = mongoose.connection.db;
}).catch(err => {
	logger.error(err);
	process.exit(0);
});

mongoose.connection.on('connecting', () => { logger.info(` *** ${config.authorDB} CONNECTING *** `); });
mongoose.connection.on('disconnected', () => { logger.error(` *** ${config.authorDB} LOST CONNECTION *** `); });
mongoose.connection.on('reconnect', () => { logger.info(` *** ${config.authorDB} RECONNECTED *** `); });
mongoose.connection.on('connected', () => { logger.info(`Connected to ${config.authorDB} DB`); });
mongoose.connection.on('reconnectFailed', () => { logger.error(` *** ${config.authorDB} FAILED TO RECONNECT *** `); });

queue.init();
models.init();
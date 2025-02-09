const mongoose = require('mongoose');

const config = require('../config');
const definition = require('../schemas/agent-action.schema').definition;
const mongooseUtils = require('../utils/mongoose.utils');

const expiry = config.hbFrequency * config.hbMissCount;
const schema = new mongoose.Schema(definition, {
	usePushEach: true
});

schema.plugin(mongooseUtils.metadataPlugin());
schema.index({ timestamp: 1 }, { expireAfterSeconds: expiry });

mongoose.model('agent-action', schema, 'b2b.agent.actions');
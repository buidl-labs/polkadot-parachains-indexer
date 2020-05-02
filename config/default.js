const dotenv = require('dotenv');
dotenv.config();
module.exports = {
	"DB": process.env.DB,
	"SENTRY_DNS": process.env.SENTRY_DNS
}

# polkadot-chains-indexer

This project serves two goals for chains inside the polkadot ecosystem:

1. chain-indexer: extract, transform and load on-chain data for post analysis to a database.
2. API: bi-directional API for reading data to power dashboards/frontends.

## Current support status <a name = "Current Support"></a>

- Currently supported chains:

  - Kusama

- Currently supported DB:

  - MongoDB

- Currently supported dashboards/frontend:
  - [YieldScan](https://yieldscan.surge.sh/#/)
  - [PolkaAnalytics](https://polkanalytics.com/#/dashboard)

## Prerequisites <a name = "prerequisites"></a>

- Node.js and npm
- A running MongoDb Atlas cluster
  - Instructions for getting started with MongoDb Atlas and deploying a cluster [link](https://docs.atlas.mongodb.com/getting-started/).

## Installation Instructions <a name = "installation"></a>

```
git https://github.com/buidl-labs/polka-analytics-api.git
cd polka-analytics-api



## Install all dependencies
npm install



## Set environment variables
export DB="your-atlas-connection-string"
export SENTRY_DNS="your-sentry-dsn-url"



## Fire up the engines:
npm start

```

## FAQ <a name = "usage"></a>

#### 1. How to get MongoDB Atlas connection string?

Follow these [instructions on how to get the connection string](https://docs.atlas.mongodb.com/tutorial/connect-to-your-cluster/#connect-to-your-atlas-cluster).

#### 2. What is Sentry DNS URL and why do I need it?

We use [Sentry](https://sentry.io/welcome/) for monitoring errors.

#### 3. Where is the production API deployed?

Currently we use [Render](https://render.com/) for production deployment.

#### 4. The above tech stack feels quite centralized, how are you planning to remove these centralized single point of failures?

We are on the same page with the ethos of the crypto space and we plan to move our storage to IPFS as when we have been able to validate our core MVP thesis of the products we are building using this indexer.

## ⛏️ Built Using <a name = "built_using"></a>

- [Node.js](https://nodejs.org/en/)
- [Express](https://expressjs.com/)
- [MongoDB Altas](https://www.mongodb.com/cloud/atlas)

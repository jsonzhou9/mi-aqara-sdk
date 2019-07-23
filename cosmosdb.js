const CosmosClient = require('@azure/cosmos').CosmosClient;
const config = require('./config');
const client = new CosmosClient({ endpoint: config.cosmosDB.endpoint, key: config.cosmosDB.key });

const databaseId = config.cosmosDB.database;
const containerId = config.cosmosDB.container;
const partitionKey = { kind: "Hash", paths: ["/id"] };

async function createDatabase() {
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Created database:${database.id}`);
}

async function createContainer() {
    const { container } = await client.database(databaseId).containers.createIfNotExists({ id: containerId, partitionKey }, { offerThroughput: 400 });
    console.log(`Created container:${container.id}`);
}

async function createFamilyItem(itemBody) {
    const { item } = await client.database(databaseId).container(containerId).items.upsert(itemBody);
    console.log(`Created or update item with id:${itemBody.id}`);
};

async function exit(message) {
    console.log(message);
}

var init = false;
module.exports = {
    CreateOrUpdateItem(item) {
        if (!init) {
            createDatabase()
                .then(() => createContainer())
                .then(() => createFamilyItem(item))
                .then(() => { exit(`Completed successfully`); })
                .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });
            init = true
        }
        else {
            createFamilyItem(item)
                .then(() => { exit(`Completed successfully`); })
                .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });
        }
    }
}



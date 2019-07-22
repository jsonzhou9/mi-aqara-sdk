const CosmosClient = require('@azure/cosmos').CosmosClient;

const host = "";
const masterKey = "";
const client = new CosmosClient({endpoint: host, key: masterKey});

const databaseId  = "WCDevice";
const containerId = "XiaomiDeviceData";
const partitionKey = { kind: "Hash", paths: ["/id"] };

async function createDatabase() {
    const { database } = await client.databases.createIfNotExists({id: databaseId});
    console.log(`Created database:\n${database.id}\n`);
}

async function createContainer() {
    const { container } = await client.database(databaseId).containers.createIfNotExists({ id: containerId, partitionKey }, { offerThroughput: 400 });
    console.log(`Created container:\n${container.id}\n`);
}

async function readContainer() {
    const { body: containerDefinition } = await client.database(databaseId).container(containerId).read();
  console.log(`Reading container:\n${containerDefinition.id}\n`);
}

async function createFamilyItem(itemBody) {
    const { item } = await client.database(databaseId).container(containerId).items.upsert(itemBody);
    console.log(`Created family item with id:\n${itemBody.id}\n`);
};

async function exit(message) {
    console.log(message);
}

var init = false;
module.exports = {
    CreateOrUpdateItem(item){
        if (!init){
            createDatabase()
            .then(() => createContainer())
            .then(() => createFamilyItem(item))
            .then(() => { exit(`Completed successfully`); })
            .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });
            init = true
        }
        else{
            createFamilyItem(item)
                .then(() => { exit(`Completed successfully`); })
                .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });
        }
    }
}



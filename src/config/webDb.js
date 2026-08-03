import mongoose from 'mongoose';

let MongoDB_URL = 'mongodb://gatewayAbroad:gateWayAbroad@ac-hvjhl1x-shard-00-00.59acfi4.mongodb.net:27017,ac-hvjhl1x-shard-00-01.59acfi4.mongodb.net:27017,ac-hvjhl1x-shard-00-02.59acfi4.mongodb.net:27017/?ssl=true&replicaSet=atlas-sphrta-shard-0&authSource=admin&appName=Cluster0';

// const MongoDB_URL = 'mongodb+srv://gatewayAbroad:gateWayAbroad@cluster0.59acfi4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const secondDB = mongoose.createConnection(
    MongoDB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

secondDB.on('connected', () => {
    console.log('Second MongoDB connected: webDB');
});

secondDB.on('error', (err) => {
    console.error('Second DB connection error:', err.message);
});

export default secondDB;
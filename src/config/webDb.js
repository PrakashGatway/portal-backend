import mongoose from 'mongoose';

const secondDB = mongoose.createConnection(
    'mongodb+srv://gatewayAbroad:gateWayAbroad@cluster0.59acfi4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
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
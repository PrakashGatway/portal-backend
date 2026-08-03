import mongoose from 'mongoose';

const connectDB = async () => {
  const mongodb_URL = `mongodb://abroadgateway370:AYlUGPHZtt97qq3L@ac-hcyqon9-shard-00-00.yxq2i6v.mongodb.net:27017,ac-hcyqon9-shard-00-01.yxq2i6v.mongodb.net:27017,ac-hcyqon9-shard-00-02.yxq2i6v.mongodb.net:27017/?ssl=true&replicaSet=atlas-drv6uy-shard-0&authSource=admin&appName=gatwayPortal`;

// const mongodb_URL=`mongodb+srv://abroadgateway370:AYlUGPHZtt97qq3L@gatwayportal.yxq2i6v.mongodb.net/?retryWrites=true&w=majority&appName=gatwayPortal`

  try {
    const conn = await mongoose.connect(mongodb_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
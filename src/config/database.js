import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://abroadgateway370:AYlUGPHZtt97qq3L@gatwayportal.yxq2i6v.mongodb.net/?retryWrites=true&w=majority&appName=gatwayPortal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
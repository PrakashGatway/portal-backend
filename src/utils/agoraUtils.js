// backend/utils/agoraCloudRecording.js
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const AGORA_BASE_URL = 'https://api.agora.io/v1';
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const AGORA_CUSTOMER_CERTIFICATE = process.env.AGORA_CUSTOMER_CERTIFICATE;
const AGORA_APP_ID = process.env.AGORA_APP_ID;

if (!AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_CERTIFICATE || !AGORA_APP_ID) {
    throw new Error("Missing required Agora credentials in environment variables (AGORA_CUSTOMER_ID, AGORA_CUSTOMER_CERTIFICATE, AGORA_APP_ID).");
}

// --- Cloud Recording API Helpers ---

function generateBasicAuthHeader() {
    const credentials = `${"1087b646f2264c16b5a88d843fd4730f"}:${"8d3c8acabd4f40f6aa24d7c155406d74"}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    return "Basic MTA4N2I2NDZmMjI2NGMxNmI1YTg4ZDg0M2ZkNDczMGY6OGQzYzhhY2FiZDRmNDBmNmFhMjRkN2MxNTU0MDZkNzQ="
}


const uuid = "7777897"

async function acquireResource(channelName, uid) {
    const url = `${AGORA_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/acquire`;
    const authHeader = generateBasicAuthHeader();

    const data = {
        cname: channelName,
        uid: uuid,
        clientRequest: {
            resourceExpiredHour: 24,
            "scene": 1
        }
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });
        console.log('Acquire Resource Response:', response.data);

        return response.data.resourceId;
    } catch (error) {
        console.error('Error acquiring resource:', error.response?.data || error.message);
        throw new Error(`Agora acquire failed: ${error.response?.data?.message || error.message}`);
    }
}

async function startRecording(resourceId, channelName, uid, token = null, mode = 'mix') {
    const url = `${AGORA_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/${mode}/start`;
    const authHeader = generateBasicAuthHeader();

    // Correct DigitalOcean Spaces configuration
    const storageConfig = {
        vendor: 4, // 4 = S3-compatible storage
        region: 0, // Use 0 for custom endpoint
        bucket: "gatway", // Your bucket name
        accessKey: "DO00TTLVJEATH4ZVYHWV",
        secretKey: "+6f26rfbVRYw8meQlFyX0y5+cv+ERfrG4DyTzTK1QW4",
        fileNamePrefix: ["recordings", channelName, Date.now().toString()],
        extensionParams: {
            endpoint: "gatway.blr1.digitaloceanspaces.com", // Remove https://
            isCustomDomain: true
        }
    };

    const data = {
        cname: channelName,
        uid: uuid,
        clientRequest: {
            token: "0066147232a6d8e42aebaf649bdc11fc387IAAWPEN4esO7uZ7Ga9SSyOzWWahoBnLRsQ04236WD+j1ynNTXBIAAAAAIgBAj+GrxUu9aAQAAQCFeMFoAgCFeMFoAwCFeMFoBACFeMFo", // You need a valid token for secured channels
            recordingConfig: {
                channelType: 1,
                streamTypes: 2,
                audioProfile: 1,
                videoStreamType: 0,
                maxIdleTime: 30,
            },
            storageConfig: storageConfig,
        }
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('Start recording success:', response.data);
        return {
            resourceId: response.data.resourceId,
            sid: response.data.sid,
            serverResponse: response.data.serverResponse
        };
    } catch (error) {
        console.error('Start recording error:', error.response?.data || error.message);
        throw error;
    }
}

async function stopRecording(resourceId, sid, mode = 'mix') {
    const url = `${AGORA_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${mode}/stop`;
    const authHeader = generateBasicAuthHeader();

    const data = {
        cname: "",
        uid: "",
        clientRequest: {}
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        const serverResponse = response.data.serverResponse;
        // Extract the final HLS URL (example for default Agora storage)
        // You need to adjust this if using S3 or another storage.
        let finalHlsUrl = null;
        const hlsFile = serverResponse?.fileList?.find(file => file.fileName?.endsWith('.m3u8') && !file.fileName.includes('playlist'));
        if (hlsFile?.fileName) {
            // This is the standard URL format for Agora's default storage final file
            finalHlsUrl = `https://recording.agora.io/v1/apps/${AGORA_APP_ID}/recordings/${hlsFile.fileName}`;
        }

        return {
            resourceId: response.data.resourceId,
            sid: response.data.sid,
            serverResponse: serverResponse,
            finalHlsUrl: finalHlsUrl
        };
    } catch (error) {
        console.error('Error stopping recording:', error.response?.data || error.message);
        throw new Error(`Agora stop recording failed: ${error.response?.data?.message || error.message}`);
    }
}

// Optional: Query recording status
async function queryRecording(resourceId, sid, mode = 'mix') {
    const url = `${AGORA_BASE_URL}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${mode}/query`;
    const authHeader = generateBasicAuthHeader();

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': authHeader
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error querying recording:', error.response?.data || error.message);
        throw new Error(`Agora query recording failed: ${error.response?.data?.message || error.message}`);
    }
}

export {
    acquireResource,
    startRecording,
    stopRecording,
    queryRecording
}
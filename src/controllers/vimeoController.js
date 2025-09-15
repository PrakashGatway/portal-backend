import { LiveClass } from '../models/Content.js';
import vimeoClient from '../utils/viemoUtils.js';

const createLiveEvent = async (req, res) => {
    try {
        const { classId, title, description, privacy } = req.body;

        const liveEvent = await new Promise((resolve, reject) => {
            vimeoClient.request(
                {
                    method: "POST",
                    path: "/me/live_events",
                    body: {
                        autogenerate_clip: true,
                        broadcast_type: "live_now", // start immediately, or use 'scheduled'
                        title: title || `Live Class: ${classId}`,
                        description: description || "Live interactive class session",
                        privacy: {
                            view: privacy || "anybody", // anybody, password, unlisted, contacts
                        },
                    },
                },
                (error, body) => {
                    if (error) return reject(error);
                    resolve(body);
                }
            );
        });

        const eventId = liveEvent.uri.split("/").pop();

        // optional: save to DB
        // await Class.findByIdAndUpdate(classId, {
        //   vimeoLiveEventId: eventId,
        //   streamKey: liveEvent.stream.key,
        //   streamUrl: liveEvent.stream.secure_rtmp,
        //   status: "created",
        //   vimeoVideoId: liveEvent.clip_id,
        // });

        res.status(201).json({
            success: true,
            message: "Live event created successfully",
            data: {
                eventId,
                streamKey: liveEvent.stream.key,
                streamUrl: liveEvent.stream.secure_rtmp,
                videoId: liveEvent.clip_id,
                playbackUrl: liveEvent.playback.hls_link, // students can watch
            },
        });
    } catch (error) {
        console.error("Error creating live event:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create live event",
            error: error.message,
        });
    }
};
const startLiveEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Activate the live event
        await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'PATCH',
                path: `/me/live_events/${eventId}`,
                query: {
                    status: 'started'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        // Update class status
        const updatedClass = await Class.findOneAndUpdate(
            { vimeoLiveEventId: eventId },
            { status: 'live' },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Live event started successfully',
            class: updatedClass
        });

    } catch (error) {
        console.error('Error starting live event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start live event',
            error: error.message
        });
    }
};

const stopLiveEvent = async (req, res) => {
    try {
        const { eventId } = req.params;

        // Deactivate the live event
        await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'PATCH',
                path: `/me/live_events/${eventId}`,
                query: {
                    status: 'ended'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        // Update class status
        const updatedClass = await Class.findOneAndUpdate(
            { vimeoLiveEventId: eventId },
            { status: 'completed' },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Live event stopped successfully',
            class: updatedClass
        });

    } catch (error) {
        console.error('Error stopping live event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop live event',
            error: error.message
        });
    }
};

const getLiveEventDetails = async (req, res) => {
    try {
        const { eventId } = req.params;

        const eventDetails = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: `/me/live_events/${eventId}`,
                query: {
                    fields: 'uri,name,description,status,stream_key,rtmp_link,embed'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(200).json({
            success: true,
            data: eventDetails
        });

    } catch (error) {
        console.error('Error fetching live event details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch live event details',
            error: error.message
        });
    }
};

const uploadVide = async (req, res) => {
    try {
        const { title, description, is360 } = req.body;
        const filePath = req.file.path; // Assuming multer is used for file upload

        // Initiate upload
        const uploadTicket = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'POST',
                path: '/me/videos',
                query: {
                    upload: {
                        approach: 'tus',
                        size: req.file.size
                    },
                    name: title || 'Class Recording',
                    description: description || 'Recorded class session',
                    spatial: is360 ? {
                        director_timeline: false,
                        immersive_profile: '360-2d',
                        projection: 'equirectangular',
                        stereo_format: 'mono'
                    } : undefined
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        // For actual file upload, you would need to implement the tus protocol
        // This is a simplified version - in production, you'd need to handle tus uploads properly

        res.status(201).json({
            success: true,
            message: 'Video upload initiated',
            data: {
                videoId: uploadTicket.uri.split('/').pop(),
                uploadLink: uploadTicket.upload.upload_link
            }
        });

    } catch (error) {
        console.error('Error initiating video upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate video upload',
            error: error.message
        });
    }
};

const uploadVideo = async (req, res) => {
    try {
        const { name, size, is360 = false, contentType, description } = req.body;
        const uploadTicket = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'POST',
                path: '/me/videos',
                query: {
                    upload: {
                        approach: 'post',
                        size: size
                    },
                    name: name || 'Recorded Class',
                    description: description || 'Uploaded via platform',
                    spatial: is360 ? {
                        director_timeline: false,
                        immersive_profile: '360-2d',
                        projection: 'equirectangular',
                        stereo_format: 'mono'
                    } : undefined
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(201).json({
            success: true,
            data: {
                uploadLink: uploadTicket.upload.upload_link,
                uri: uploadTicket.uri,
                videoId: uploadTicket.uri.split('/').pop()
            }
        });

    } catch (error) {
        console.error('Error creating upload ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create upload ticket',
            error: error.message
        });
    }
};

const verifyVimeoUpload = async (req, res) => {
    try {
        const { videoUri } = req.params;
        const { videoID } = req.query;

        if (!videoUri) {
            return res.status(400).json({
                success: false,
                message: 'Video URI is required'
            });
        }

        // Extract video ID from URI if needed
        let videoId;
        if (videoUri.startsWith('/videos/')) {
            videoId = videoUri.split('/').pop();
        } else {
            videoId = videoUri;
        }

        // Make request to Vimeo API to get video details
        const videoDetails = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}`,
                query: {
                    fields: 'uri,name,description,duration,status,files,transcode,created_time,modified_time,link,player_embed_url,pictures,stats'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        // Check if video is ready (not still uploading or transcoding)
        const isReady = videoDetails.status === 'available';
        const isProcessing = videoDetails.status === 'transcoding' || videoDetails.status === 'uploading';

        // Return comprehensive video data
        return res.status(200).json({
            success: true,
            message: 'Video upload verified successfully',
            data: {
                id: videoDetails.uri.split('/').pop(),
                uri: videoDetails.uri,
                name: videoDetails.name,
                description: videoDetails.description || '',
                duration: videoDetails.duration || 0,
                status: videoDetails.status,
                created_time: videoDetails.created_time,
                modified_time: videoDetails.modified_time,
                link: videoDetails.link,
                player_embed_url: videoDetails.player_embed_url,
                pictures: videoDetails.pictures,
                stats: videoDetails.stats,
                files: videoDetails.files,
                transcode: videoDetails.transcode,
                isReady: isReady,
                isProcessing: isProcessing,
                progress: videoDetails.transcode?.status === 'in_progress' ?
                    videoDetails.transcode.progress : (isReady ? 100 : 0)
            }
        });

    } catch (error) {
        console.error('Error verifying Vimeo upload:', error);

        // Handle specific Vimeo errors
        if (error.message && error.message.includes('404')) {
            return res.status(404).json({
                success: false,
                message: 'Video not found. Upload may still be processing or invalid URI.'
            });
        }

        if (error.message && error.message.includes('403')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Check your Vimeo access token.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to verify video upload',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

const getVideoDetails = async (req, res) => {
    try {
        const { videoId } = req.params;

        const videoDetails = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}`,
                query: {
                    fields: 'uri,name,description,duration,spatial,width,height,play,embed'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(200).json({
            success: true,
            data: videoDetails
        });

    } catch (error) {
        console.error('Error fetching video details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video details',
            error: error.message
        });
    }
};

const getEmbedCode = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { autoplay, loop, controls } = req.query;

        const embedHtml = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}/presets/default`,
                query: {
                    fields: 'html'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body.html);
                }
            });
        });

        // Customize embed code based on parameters
        let customizedEmbed = embedHtml;
        if (autoplay === 'true') {
            customizedEmbed = embedHtml.replace('src="', 'src="?autoplay=1&');
        }

        if (loop === 'true') {
            customizedEmbed = customizedEmbed.replace('src="', 'src="?loop=1&');
        }

        if (controls === 'false') {
            customizedEmbed = customizedEmbed.replace('src="', 'src="?controls=0&');
        }

        res.status(200).json({
            success: true,
            embedCode: customizedEmbed
        });

    } catch (error) {
        console.error('Error generating embed code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate embed code',
            error: error.message
        });
    }
};

const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;

        await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'DELETE',
                path: `/videos/${videoId}`
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Video deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete video',
            error: error.message
        });
    }
};

const updateVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { title, description, privacy } = req.body;

        const updatedVideo = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'PATCH',
                path: `/videos/${videoId}`,
                query: {
                    name: title,
                    description: description,
                    privacy: {
                        view: privacy
                    }
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(200).json({
            success: true,
            message: 'Video updated successfully',
            data: updatedVideo
        });

    } catch (error) {
        console.error('Error updating video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update video',
            error: error.message
        });
    }
};

const getUserVideos = async (req, res) => {
    try {
        const { page = 1, per_page = 10 } = req.query;

        const videos = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: '/me/videos',
                query: {
                    page: page,
                    per_page: per_page,
                    fields: 'uri,name,description,duration,privacy,status,created_time,modified_time,pictures'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(200).json({
            success: true,
            data: videos
        });

    } catch (error) {
        console.error('Error fetching user videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user videos',
            error: error.message
        });
    }
};

const create360Video = async (req, res) => {
    try {
        const { title, description } = req.body;

        // Create a 360 video with spatial settings
        const video360 = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'POST',
                path: '/me/videos',
                query: {
                    upload: {
                        approach: 'tus',
                        size: req.file.size
                    },
                    name: title || '360 Class Recording',
                    description: description || '360 immersive class session',
                    spatial: {
                        director_timeline: false,
                        immersive_profile: '360-2d',
                        projection: 'equirectangular',
                        stereo_format: 'mono'
                    }
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        res.status(201).json({
            success: true,
            message: '360 video created successfully',
            data: {
                videoId: video360.uri.split('/').pop(),
                uploadLink: video360.upload.upload_link,
                is360: true
            }
        });

    } catch (error) {
        console.error('Error creating 360 video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create 360 video',
            error: error.message
        });
    }
};

const get360VideoControls = async (req, res) => {
    try {
        const { videoId } = req.params;

        const videoDetails = await new Promise((resolve, reject) => {
            vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}`,
                query: {
                    fields: 'spatial,play,embed'
                }
            }, (error, body, statusCode, headers) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });

        // Check if video is 360
        const is360 = videoDetails.spatial && videoDetails.spatial.projection === 'equirectangular';

        if (!is360) {
            return res.status(400).json({
                success: false,
                message: 'Video is not a 360 video'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                is360: true,
                spatial: videoDetails.spatial,
                controls: {
                    projection: videoDetails.spatial.projection,
                    stereoFormat: videoDetails.spatial.stereo_format,
                    immersiveProfile: videoDetails.spatial.immersive_profile,
                    hasDirectorTimeline: videoDetails.spatial.director_timeline
                }
            }
        });

    } catch (error) {
        console.error('Error fetching 360 video controls:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch 360 video controls',
            error: error.message
        });
    }
};

export {
    createLiveEvent,
    startLiveEvent,
    stopLiveEvent,
    getLiveEventDetails,
    uploadVideo,
    getVideoDetails,
    getEmbedCode,
    deleteVideo,
    updateVideo,
    getUserVideos,
    create360Video,
    get360VideoControls,
    verifyVimeoUpload
};
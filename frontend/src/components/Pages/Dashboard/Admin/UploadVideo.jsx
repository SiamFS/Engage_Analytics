import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Label,
  TextInput,
  Textarea,
  Select,
  Spinner
} from 'flowbite-react';
import {
  Upload as UploadIcon,
  Video, 
  ImagePlus, 
  Check,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Star,
  X
} from 'lucide-react';
import VideoService from '../../../../utils/VideoService';

const UploadVideo = () => {
  const thumbnailCanvasRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    visibility: 'private',
    view_limit: '',
    auto_private_after: ''
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [processedThumbnailFile, setProcessedThumbnailFile] = useState(null);
  const [generatedFilename, setGeneratedFilename] = useState('');
  const [uploadUrls, setUploadUrls] = useState({
    videoUrl: null,
    thumbnailUrl: null
  });
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState(null);
  const [thumbDimensions, setThumbDimensions] = useState({ width: 0, height: 0 });
  const [isAutoCropping, setIsAutoCropping] = useState(false);
  const [uploadStage, setUploadStage] = useState('preparing');
  const [rewardInfo, setRewardInfo] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  const categories = [
    { value: 'educational', label: 'Educational' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'music', label: 'Music' },
    { value: 'news', label: 'News & Politics' },
    { value: 'technology', label: 'Technology' },
    { value: 'travel', label: 'Travel & Events' },
    { value: 'sports', label: 'Sports' },
    { value: 'other', label: 'Other' },
  ];

  const TARGET_WIDTH = 1280;
  const TARGET_HEIGHT = 720;

  useEffect(() => {
    const currentVideoUrl = videoPreviewUrl;
    const currentThumbnailUrl = thumbnailPreviewUrl;

    return () => {
      if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
      if (currentThumbnailUrl) URL.revokeObjectURL(currentThumbnailUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  const handleCanvasBlob = (blob, file, resolve, reject) => {
    if (!blob) {
      setIsAutoCropping(false);
      reject(new Error("Failed to create thumbnail blob"));
      return;
    }
    
    const processedFile = new File([blob], `processed_${file.name.split('.')[0]}.jpg`, { type: 'image/jpeg' });
    setProcessedThumbnailFile(processedFile);
    setIsAutoCropping(false);
    resolve(processedFile);
  };

  const handleImageLoad = (img, file, resolve, reject) => {
    const canvas = thumbnailCanvasRef.current;
    if (!canvas) {
      setIsAutoCropping(false);
      reject(new Error("Canvas reference not available"));
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width: sourceWidth, height: sourceHeight } = img;
    
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    
    if (sourceAspect > targetAspect) {
      drawHeight = TARGET_HEIGHT;
      drawWidth = sourceWidth * (TARGET_HEIGHT / sourceHeight);
      offsetX = (TARGET_WIDTH - drawWidth) / 2;
    } else {
      drawWidth = TARGET_WIDTH;
      drawHeight = sourceHeight * (TARGET_WIDTH / sourceWidth);
      offsetY = (TARGET_HEIGHT - drawHeight) / 2;
    }
    
    ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    
    canvas.toBlob((blob) => handleCanvasBlob(blob, file, resolve, reject), 'image/jpeg', 0.9);
  };

  const processThumbnail = (file) => {
    return new Promise((resolve, reject) => {
      setIsAutoCropping(true);
      const img = new Image();
      img.onload = () => handleImageLoad(img, file, resolve, reject);
      img.onerror = () => {
        setIsAutoCropping(false);
        reject(new Error("Failed to load thumbnail image"));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const generateAndSetFilename = () => {
    if (!formData.title) return '';
    const timestamp = Date.now();
    const safeName = formData.title.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/_+/g, '_').substring(0, 50);
    const randomBytes = new Uint8Array(5); 
    window.crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const uniqueFilename = `${safeName || 'video'}_${timestamp}_${randomString.substring(0, 7)}`; 
    setGeneratedFilename(uniqueFilename);
    return uniqueFilename;
  };

  const validateMetadataForm = () => {
    if (!formData.title.trim()) return { valid: false, message: 'Video title is required.' };
    return { valid: true, message: '' };
  };

  const handleMetadataSubmit = async (e) => {
    e.preventDefault();
    const validation = validateMetadataForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }

    const filenameToSubmit = generatedFilename || generateAndSetFilename();
    if (!filenameToSubmit) {
      setStatusMessage("Could not generate a filename. Please ensure title is set.");
      setUploadStatus('error');
      return;
    }

    const metadataPayload = { ...formData, filename: filenameToSubmit };

    setUploadStatus('pending');
    setStatusMessage('Initializing upload...');

    try {
      const response = await VideoService.initiateVideoUpload(metadataPayload);

      if (!response?.video_upload_url || !response?.thumbnail_upload_url) {
        throw new Error("Backend did not return valid upload URLs.");
      }

      setUploadUrls({
        videoUrl: response.video_upload_url,
        thumbnailUrl: response.thumbnail_upload_url
      });
      if (response.points_awarded) {
        setRewardInfo({
          points_awarded: response.points_awarded,
          total_points: response.total_points,
        });
      }
      setCurrentStep(2);
      setUploadStatus(null);
      setStatusMessage('');
    } catch (error) {
      console.error('Error initiating upload:', error);
      setUploadStatus('error');
      setStatusMessage(error.message || 'Failed to initialize upload. Please check details and try again.');
    }
  };

  const validateUrl = (url) => {
    return url?.startsWith('blob:') ?? false;
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }

    if (!file) {
      setVideoFile(null);
      return;
    }
    
    if (!file.type.startsWith('video/') || file.size > 500 * 1024 * 1024) {
      setStatusMessage('Invalid file type or size. Please select a valid video file under 500MB.');
      setUploadStatus('error');
      e.target.value = '';
      setVideoFile(null);
      return;
    }

    setVideoFile(file);
    setUploadStatus(null);
    setStatusMessage('');

    try {
      const newPreviewUrl = URL.createObjectURL(file);
      if (validateUrl(newPreviewUrl)) {
        const sanitizedUrl = newPreviewUrl.replace(/[^a-zA-Z0-9-_.:\/]/g, '');
        setVideoPreviewUrl(sanitizedUrl);
      } else {
        throw new Error('Invalid URL format');
      }
    } catch (error) {
      console.error('Error creating video preview:', error);
      setStatusMessage('Failed to create video preview.');
      setUploadStatus('error');
    }
    
    generateThumbnailFromVideo(file);
  };

  const handleVideoThumbnailBlob = (blob) => {
    if (blob) {
      const thumbnailFile = new File([blob], `thumbnail_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setStatusMessage('Auto-generated thumbnail from video. You can replace it if needed.');
      setTimeout(() => setStatusMessage(''), 5000);
      handleThumbnailChangeWithFile(thumbnailFile);
    }
  };

  const handleVideoSeeked = (video) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(handleVideoThumbnailBlob, 'image/jpeg', 0.95);
  };

  const generateThumbnailFromVideo = (videoFile) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      video.currentTime = video.duration * 0.25;
    };
    
    video.onseeked = () => handleVideoSeeked(video);
    
    video.onerror = () => {
      console.error('Error extracting thumbnail from video');
    };
    
    try {
      const videoUrl = URL.createObjectURL(videoFile);
      if (validateUrl(videoUrl)) {
        video.src = videoUrl;
        
        video.addEventListener('loadeddata', () => { URL.revokeObjectURL(videoUrl); }, { once: true });
        video.addEventListener('error', () => { URL.revokeObjectURL(videoUrl); }, { once: true });
      } else {
        throw new Error('Invalid URL format');
      }
    } catch (error) {
      console.error('Error creating video preview:', error);
      setStatusMessage('Failed to generate thumbnail from video.');
      setUploadStatus('error');
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setThumbnailFile(null);
      return;
    }
    handleThumbnailChangeWithFile(file);
  };

  const handleThumbnailChangeWithFile = async (file) => {
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl(null);
    }

    if (!file.type.startsWith('image/')) {
      setStatusMessage('Invalid file type. Please select an image file (JPG, PNG, WEBP).');
      setUploadStatus('error');
      const thumbInput = document.getElementById('thumbnail');
      if (thumbInput) thumbInput.value = '';
      setThumbnailFile(null);
      return;
    }

    setThumbnailFile(file);
    setUploadStatus(null);
    setStatusMessage('');

    try {
      const processedFile = await processThumbnail(file);
      
      const newPreviewUrl = URL.createObjectURL(processedFile);
      if (validateUrl(newPreviewUrl)) {
        setThumbnailPreviewUrl(newPreviewUrl);
      } else {
        throw new Error('Invalid URL format');
      }
      
      const img = new Image();
      img.onload = () => {
        setThumbDimensions({ width: img.width, height: img.height });
      };
      img.src = newPreviewUrl;
      
    } catch (error) {
      console.error('Error processing thumbnail:', error);
      setStatusMessage('Failed to process thumbnail. Please try another image.');
      setUploadStatus('error');
    }
  };

  const validateFileForm = () => {
    if (!videoFile) return { valid: false, message: 'Please select a video file to upload.' };
    if (!processedThumbnailFile && !thumbnailFile) return { valid: false, message: 'Please select a thumbnail image.' };
    if (!uploadUrls.videoUrl || !uploadUrls.thumbnailUrl) return { valid: false, message: 'Upload authorization is missing. Please go back to details.' };
    return { valid: true, message: '' };
  };

  const updateProgressWithDelay = (value, message = null) => {
    setUploadProgress(prevProgress => Math.max(prevProgress, value));
    if (message) setStatusMessage(message);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const validation = validateFileForm();
    if (!validation.valid) {
      setUploadStatus('error');
      setStatusMessage(validation.message);
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadStage('preparing');
    setStatusMessage('Preparing upload...');

    if (videoPreviewUrl) { URL.revokeObjectURL(videoPreviewUrl); setVideoPreviewUrl(null); }
    if (thumbnailPreviewUrl) { URL.revokeObjectURL(thumbnailPreviewUrl); setThumbnailPreviewUrl(null); }

    try {
      setUploadStage('video');
      setStatusMessage(`Uploading video: ${videoFile.name}...`);
      updateProgressWithDelay(1, 'Uploading video...');
      
      await VideoService.uploadFileToBlob(uploadUrls.videoUrl, videoFile, (progress) => {
        updateProgressWithDelay(Math.min(Math.floor(progress * 0.7), 70), `Uploading video...`);
      });

      updateProgressWithDelay(70, 'Video upload complete. Preparing thumbnail...');
      
      setUploadStage('thumbnail');
      const thumbnailToUpload = processedThumbnailFile || thumbnailFile;
      setStatusMessage(`Uploading thumbnail: ${thumbnailToUpload.name}...`);
      
      await VideoService.uploadFileToBlob(uploadUrls.thumbnailUrl, thumbnailToUpload, (progress) => {
        updateProgressWithDelay(70 + Math.min(Math.floor(progress * 0.3), 30), `Uploading thumbnail...`);
      });

      setUploadProgress(100);
      setUploadStage('complete');
      setUploadStatus('success');
      setStatusMessage('Video and thumbnail uploaded successfully!');
      
      setTimeout(() => { setCurrentStep(3); }, 500);
    } catch (error) {
      console.error('File upload failed:', error);
      setUploadStatus('error');
      setStatusMessage(`Upload failed: ${error.message || 'An unknown error occurred during upload.'}`);
    }
  };

  const handleReset = () => {
    setFormData({ title: '', description: '', category: '', visibility: 'private', view_limit: '', auto_private_after: '' });
    setVideoFile(null);
    setThumbnailFile(null);
    setProcessedThumbnailFile(null);
    setGeneratedFilename('');
    setUploadUrls({ videoUrl: null, thumbnailUrl: null });
    setUploadStatus(null);
    setStatusMessage('');
    setUploadProgress(0);
    setUploadStage('preparing');
    setRewardInfo(null);
    setCurrentStep(1);

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setVideoPreviewUrl(null);
    setThumbnailPreviewUrl(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/') && file.size <= 500 * 1024 * 1024) {
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        setVideoFile(file);
        setUploadStatus(null);
        setStatusMessage('');
        const newPreviewUrl = URL.createObjectURL(file);
        if (validateUrl(newPreviewUrl)) {
          const sanitizedUrl = newPreviewUrl.replace(/[^a-zA-Z0-9-_.:\/]/g, '');
          setVideoPreviewUrl(sanitizedUrl);
        }
        generateThumbnailFromVideo(file);
      } else {
        setStatusMessage(file.type.startsWith('video/') ? 'File exceeds 500MB limit.' : 'Please select a valid video file.');
        setUploadStatus('error');
      }
    }
  };

  const renderMetadataForm = () => (
    <form onSubmit={handleMetadataSubmit} className="space-y-4">
      <div>
        <div className="mb-2 block">
          <Label htmlFor="title" value="Video Title (required)" className="text-white" />
        </div>
        <TextInput
          id="title"
          value={formData.title}
          onChange={handleInputChange}
          onBlur={generateAndSetFilename}
          placeholder="Enter a catchy title for your video"
          required
          maxLength={100}
        />
      </div>
      <div>
        <div className="mb-2 block">
          <Label htmlFor="description" value="Description" className="text-white" />
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Tell viewers about your video (optional)"
          rows={4}
          maxLength={5000}
        />
      </div>
      <div>
        <div className="mb-2 block">
          <Label htmlFor="category" value="Category" className="text-white" />
        </div>
        <Select id="category" value={formData.category} onChange={handleInputChange}>
          <option value="">Select a category (optional)</option>
          {categories.map(category => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <div className="mb-2 block">
          <Label htmlFor="visibility" value="Visibility" className="text-white" />
        </div>
        <Select id="visibility" value={formData.visibility} onChange={handleInputChange}>
          <option value="private">Private (Only you can see)</option>
          <option value="unlisted">Unlisted (Anyone with the link)</option>
          <option value="public">Public (Visible to everyone)</option>
        </Select>
        <p className="mt-1 text-xs text-gray-300">Choose who can view your video.</p>
      </div>
      
      <div>
        <div className="mb-2 block">
          <Label htmlFor="view_limit" value="View Limit (optional)" className="text-white" />
        </div>
        <TextInput
          id="view_limit"
          type="number"
          min="0"
          value={formData.view_limit || ''}
          onChange={handleInputChange}
          placeholder="Maximum number of views before video becomes private"
        />
        <p className="mt-1 text-xs text-gray-300">Set a maximum number of views. After reaching this limit, the video will become private.</p>
      </div>
      
      <div className="flex justify-end space-x-3 pt-5 border-t border-elevated-border mt-5">
        <Button type="button" onClick={handleReset} disabled={uploadStatus === 'pending'} className="border border-elevated-border bg-surface-600 text-gray-300 hover:bg-surface-500 focus:ring-0">
          Clear Form
        </Button>
        <Button type="submit" disabled={uploadStatus === 'pending' || !formData.title.trim()} className="bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 focus:ring-0" isProcessing={uploadStatus === 'pending'} processingSpinner={<Spinner size="sm" />}>
          {uploadStatus === 'pending' ? 'Initializing...' : (
            <>Continue to Upload <ArrowRight className="ml-2 h-5 w-5" /></>
          )}
        </Button>
      </div>
    </form>
  );

  const renderFileUploadForm = () => (
    <form onSubmit={handleFileUpload} className="space-y-6">
      <div className="text-center mb-6"> 
        <h3 className="text-xl font-semibold text-white">Upload Files</h3>
        <p className="text-gray-300 mt-1">Select the video file and a thumbnail image.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="video" value="Video File (required)" className="text-white" />
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragOver
                  ? 'border-brand-400 bg-brand-600/10'
                  : 'border-elevated-border bg-surface-600 hover:border-brand-500/50 hover:bg-surface-500/50'
              }`}
              onClick={() => videoInputRef.current?.click()}
            >
              <input ref={videoInputRef} type="file" id="video" onChange={handleVideoChange} accept="video/*" className="hidden" />
              <Video className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-300">Drag & drop video or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI (max 500MB)</p>
            </div>
            {videoFile && (
              <p className="mt-2 text-xs text-green-400 flex items-center">
                <Check size={14} className="mr-1 flex-shrink-0"/>
                <span className="truncate">Selected: {videoFile.name} ({(videoFile.size / (1024*1024)).toFixed(2)} MB)</span>
              </p>
            )}
          </div>

          <div className="flex-grow flex flex-col min-h-[150px]">
            {videoPreviewUrl && validateUrl(videoPreviewUrl) ? (
              <div className="p-3 border border-elevated-border rounded-lg bg-surface-600 flex flex-col h-full"> 
                <Label value="Video Preview" className="text-sm font-medium text-gray-300 mb-2 block flex-shrink-0"/>
                <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex-grow">
                  <video src={videoPreviewUrl || ''} controls preload="metadata" className="absolute top-0 left-0 w-full h-full object-contain" aria-label="Video Preview">
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-elevated-border rounded-lg bg-surface-600 flex items-center justify-center text-gray-300 h-full">
                <Video className="w-10 h-10" /> <span className="ml-2">Video preview appears here</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-4"> 
          <div>
            <div className="mb-2 block">
              <Label htmlFor="thumbnail" value="Thumbnail Image (required)" className="text-white" />
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const file = files[0];
                  if (file.type.startsWith('image/')) {
                    handleThumbnailChangeWithFile(file);
                  } else {
                    setStatusMessage('Please select an image file for thumbnail.');
                    setUploadStatus('error');
                  }
                }
              }}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragOver
                  ? 'border-brand-400 bg-brand-600/10'
                  : 'border-elevated-border bg-surface-600 hover:border-brand-500/50 hover:bg-surface-500/50'
              }`}
              onClick={() => thumbInputRef.current?.click()}
            >
              <input ref={thumbInputRef} type="file" id="thumbnail" onChange={handleThumbnailChange} accept="image/jpeg, image/png, image/webp, image/gif" className="hidden" />
              <ImagePlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-300">Drag & drop thumbnail or click to browse</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (auto-resized to 1280x720)</p>
            </div>
            {thumbnailFile && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-green-400 flex items-center">
                  <Check size={14} className="mr-1 flex-shrink-0"/> 
                  <span className="truncate">{isAutoCropping ? "Processing..." : `Selected: ${thumbnailFile.name} (${(thumbnailFile.size / 1024).toFixed(1)} KB)`}</span>
                </p>
                {isAutoCropping && <Spinner size="sm" />}
              </div>
            )}
          </div>
          <div className="flex-grow flex flex-col min-h-[150px]">
            {thumbnailPreviewUrl ? (
              <div className="p-3 border border-elevated-border rounded-lg bg-surface-600 flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <Label value="Thumbnail Preview (16:9)" className="text-sm font-medium text-gray-300 flex-shrink-0"/>
                  <div className="text-xs text-gray-300">{thumbDimensions.width}x{thumbDimensions.height} px</div>
                </div>
                <div className="relative w-full aspect-video bg-black rounded overflow-hidden flex-grow"> 
                  <img src={thumbnailPreviewUrl} alt="Thumbnail Preview" className="absolute top-0 left-0 w-full h-full object-contain" />
                </div>
              </div>
            ) : (
              <div className="p-3 border border-dashed border-elevated-border rounded-lg bg-surface-600 flex items-center justify-center text-gray-300 h-full">
                <ImagePlus className="w-10 h-10" /> <span className="ml-2">Thumbnail preview appears here</span>
              </div>
            )}
          </div>
        </div>
      </div> 

      <div className="flex justify-between items-center pt-5 border-t border-elevated-border mt-8">
        <Button type="button" onClick={() => { setCurrentStep(1); setUploadStatus(null); setStatusMessage(''); }} disabled={uploadStatus === 'uploading'} className="border border-elevated-border bg-surface-600 text-gray-300 hover:bg-surface-500 focus:ring-0">
          <ArrowLeft className="mr-2 h-5 w-5" /> Back to Details
        </Button>
        <Button type="submit" disabled={!videoFile || (!thumbnailFile && !processedThumbnailFile) || !uploadUrls.videoUrl || !uploadUrls.thumbnailUrl || uploadStatus === 'uploading' || isAutoCropping} className="bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 focus:ring-0" isProcessing={uploadStatus === 'uploading' || isAutoCropping} processingSpinner={<Spinner size="sm" />}>
          {uploadStatus === 'uploading' ? 'Uploading...' : (<><UploadIcon className="mr-2 h-5 w-5" /> Start Upload</>)}
        </Button>
      </div>
    </form>
  );

  const renderUploadProgress = () => (
    <div className="py-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Uploading Your Files</h3>
        <p className="text-gray-300">Please keep this window open until the upload completes.</p>
      </div>
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <div className="mb-1 text-gray-300">
            <span>
              {uploadStage === 'preparing' ? 'Preparing upload...' : uploadStage === 'video' ? 'Uploading video...' : uploadStage === 'thumbnail' ? 'Uploading thumbnail...' : 'Processing...'}
            </span>
          </div>
          <div className="w-full bg-elevated rounded-full h-3 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-400 h-full rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-center text-gray-300 mt-4">
          <Spinner size="sm" className="mr-2" aria-label="Uploading" />
          <span>{statusMessage || 'Processing...'}</span>
        </div>
      </div>
    </div>
  );

  const renderSuccessMessage = () => (
    <div className="py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500 text-white mx-auto flex items-center justify-center mb-5 ring-4 ring-green-500/30">
        <Check size={32} strokeWidth={3} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Upload Complete!</h3>
      <p className="text-gray-300 max-w-md mx-auto mb-4">
        Your video <span className="font-medium text-white">&quot;{formData.title}&quot;</span> has been successfully uploaded. It may take a few moments to process before it&apos;s available.
      </p>
      {rewardInfo && (
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl px-5 py-3 mb-6">
          <Star size={18} className="text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-200 text-sm font-medium">
            You earned <span className="text-yellow-400 font-bold">{rewardInfo.points_awarded} points</span> for this upload! Total: <span className="text-white font-bold">{rewardInfo.total_points}</span> points
          </span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={handleReset} className="border border-elevated-border bg-surface-600 text-gray-300 hover:bg-surface-500 focus:ring-0">Upload Another Video</Button>
        <Button href="/dashboard" className="bg-brand-600 hover:bg-brand-700 text-white focus:ring-0">View My Dashboard</Button>
      </div>
    </div>
  );

  const renderAlert = () => {
    if (!statusMessage || (uploadStatus !== 'error' && uploadStatus !== 'info')) return null;
    return (
      <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${uploadStatus === 'error' ? 'bg-red-900/20 border border-red-800/40' : 'bg-brand-600/10 border border-brand-500/20'}`}>
        {uploadStatus === 'error' && <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />}
        <div className="flex-1">
          <p className={`font-medium text-sm ${uploadStatus === 'error' ? 'text-red-300' : 'text-brand-300'}`}>{statusMessage}</p>
        </div>
        <button onClick={() => { setUploadStatus(null); setStatusMessage(''); }} className="text-gray-500 hover:text-white shrink-0" type="button">
          <X size={16} />
        </button>
      </div>
    );
  };

  const getStepIconClass = (stepNumber) => {
    if (currentStep === stepNumber) return 'border-brand-500 bg-brand-900';
    if (currentStep > stepNumber) return 'border-green-500 bg-green-900';
    return 'border-elevated-border bg-surface-600';
  };

  const renderSteps = () => {
    const steps = [
      { number: 1, label: 'Video Details' },
      { number: 2, label: 'Upload Files' },
      { number: 3, label: 'Complete' }
    ];
    
    return (
      <ol className="flex items-center w-full text-sm font-medium text-center text-gray-400 sm:text-base mb-8">
        {steps.map((step, index, arr) => {
          let textColorClass = 'text-gray-500';
          if (currentStep === step.number) textColorClass = 'text-brand-500';
          else if (currentStep > step.number) textColorClass = 'text-green-500';
          
          const hasAfterContent = index < arr.length - 1;
          const iconClassName = getStepIconClass(step.number);
          
          return (
            <li key={step.number} className={`flex items-center ${textColorClass} ${hasAfterContent ? "w-full after:content-[''] after:w-full after:h-1 after:border-b after:border-elevated-border after:border-1 after:inline-block" : ''} ${index > 0 ? 'md:w-full' : ''}`}>
              <span className={`flex items-center justify-center ${hasAfterContent ? 'after:content-["/"] sm:after:hidden after:mx-2 after:text-gray-500' : ''}`}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 mr-2 ${iconClassName}`}>
                  {currentStep > step.number ? <Check size={16} /> : <span>{step.number}</span>}
                </div>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  const renderContent = () => {
    if (uploadStatus === 'uploading') return renderUploadProgress();
    switch (currentStep) {
      case 1: return renderMetadataForm();
      case 2: return renderFileUploadForm();
      case 3: return renderSuccessMessage();
      default: return <p className="text-center text-gray-300">Loading...</p>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-0">
      <h1 className="text-2xl font-bold text-white mb-6">Upload New Video</h1>

      {renderSteps()}
      {renderAlert()}

      <div className="bg-elevated border border-elevated-border shadow-lg rounded-xl p-6">
        {renderContent()}
      </div>

      <canvas ref={thumbnailCanvasRef} className="hidden" width={TARGET_WIDTH} height={TARGET_HEIGHT} />
    </div>
  );
};

export default UploadVideo;

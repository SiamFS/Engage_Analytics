import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spinner } from 'flowbite-react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, CameraOff } from 'lucide-react';
import WebcamRecorder from './WebcamRecorder';

const VideoPlayer = ({ videoUrl, thumbnailUrl, title, autoPlay = false, onEnded, onPlay, videoId, onUploadFlowDone }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [faceBlocked, setFaceBlocked] = useState(false);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const webcamRecorderRef = useRef(null);
  const isPlayingRef = useRef(false);
  const webcamPermissionRef = useRef(null);
  const faceBlockedRef = useRef(false);
  const playbackStartedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onPlayRef = useRef(onPlay);
  const onUploadFlowDoneRef = useRef(onUploadFlowDone);

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onUploadFlowDoneRef.current = onUploadFlowDone; }, [onUploadFlowDone]);

  useEffect(() => {
    if (!videoUrl) {
      setError('Video URL is missing');
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
      if (autoPlay) {
        videoElement.play().catch(e => {
          console.error('Autoplay prevented:', e);
        });
      }
    };

    const handleError = () => {
      setError('Failed to load video. Please try again later.');
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (onEndedRef.current) onEndedRef.current();
      handleVideoComplete();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (!playbackStartedRef.current && onPlayRef.current) {
        playbackStartedRef.current = true;
        onPlayRef.current();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    const handleVolumeChange = () => {
      setVolume(videoElement.volume);
      setIsMuted(videoElement.muted);
    };
    
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('volumechange', handleVolumeChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
      
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimer();
    };

    if (videoContainerRef.current) {
      videoContainerRef.current.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('volumechange', handleVolumeChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      
      if (videoContainerRef.current) {
        videoContainerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [videoUrl, autoPlay]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (webcamPermissionRef.current === 'granted' && isPlayingRef.current) {
        e.preventDefault();
        e.returnValue = 'Recording in progress - are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    playbackStartedRef.current = false;
  }, [videoUrl]);

  const resetControlsTimer = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    
    if (isPlayingRef.current) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (faceBlockedRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => {
        console.error('Play prevented:', e);
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      } else if (videoContainerRef.current.webkitRequestFullscreen) {
        videoContainerRef.current.webkitRequestFullscreen();
      } else if (videoContainerRef.current.msRequestFullscreen) {
        videoContainerRef.current.msRequestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleWebcamPermissionChange = (state) => {
    webcamPermissionRef.current = state;
  };

  const handleRecordingError = (errorMessage) => {
    console.error('Recording error:', errorMessage);
  };

  useEffect(() => {
    if (faceBlocked && isPlaying && videoRef.current) {
      videoRef.current.pause();
    }
  }, [faceBlocked, isPlaying]);

  const handleFaceBlockedChange = (blocked) => {
    const prev = faceBlockedRef.current;
    faceBlockedRef.current = blocked;
    setFaceBlocked(blocked);
    if (prev && !blocked && videoRef.current && !videoRef.current.ended) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleVideoComplete = async () => {
    try {
      if (webcamRecorderRef.current?.stopAndUploadRecording) {
        await webcamRecorderRef.current.stopAndUploadRecording();
      }
    } catch (error) {
      console.error('Error processing recording on video completion:', error);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={videoContainerRef}
      className={`relative w-full ${isFullscreen ? 'h-full' : 'aspect-video'} bg-black ${isFullscreen ? '' : 'rounded-xl'} overflow-hidden group`}
      role="application"
      aria-label="Video Player"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="xl" className="fill-blue-500" />
            <p className="text-gray-400 text-sm">Loading video...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10">
          <div className="text-center p-6">
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl font-bold">!</span>
            </div>
            <p className="text-red-400 mb-3 text-sm">{error}</p>
            <Button
              color="blue"
              size="sm"
              onClick={() => {
                if (videoRef.current) {
                  setIsLoading(true);
                  setError(null);
                  videoRef.current.load();
                }
              }}
              className="bg-brand-600 hover:bg-brand-700 focus:ring-0"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        poster={thumbnailUrl}
        preload="metadata"
        playsInline
        muted={autoPlay}
        onClick={togglePlay}
        title={title}
      >
        <source src={videoUrl} type="video/mp4" />
        <track kind="captions" src="" label="English" />
        Your browser does not support the video tag.
      </video>
     
      {videoId && (
        <WebcamRecorder
          ref={webcamRecorderRef}
          isVideoPlaying={isPlaying}
          videoId={videoId}
          videoDuration={duration}
          onPermissionChange={handleWebcamPermissionChange}
          onError={handleRecordingError}
          showControls={showControls}
          onFaceBlockedChange={handleFaceBlockedChange}
          onUploadFlowDone={onUploadFlowDone}
        />
      )}

      <div
        className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Bottom controls panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
          showControls || !isPlaying ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Progress bar */}
        <div className="px-4 pt-2">
          <div className="relative h-1.5 bg-surface-500/50 rounded-full overflow-hidden group/progress cursor-pointer"
            onClick={(e) => {
              if (!videoRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = percent * duration;
            }}
          >
            <div 
              className="h-full bg-brand-500 rounded-full relative transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className={`p-1.5 rounded-full transition-all duration-200 ${
                faceBlocked && !isPlaying
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-white hover:bg-white/10 hover:text-brand-400'
              }`}
              aria-label={isPlaying ? 'Pause' : faceBlocked ? 'Face required to play' : 'Play'}
              type="button"
              disabled={faceBlocked && !isPlaying}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="p-1.5 rounded-full text-white hover:bg-white/10 hover:text-blue-400 transition-all duration-200"
                aria-label={isMuted ? "Unmute" : "Mute"}
                type="button"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                    if (newVolume > 0 && isMuted) {
                      videoRef.current.muted = false;
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-16 h-1.5 bg-gray-500/50 rounded-full accent-blue-500 cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                aria-label="Volume control"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            <span className="text-gray-300 text-xs font-medium tabular-nums select-none">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {faceBlocked && !isPlaying && (
              <div className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 rounded-lg px-2.5 py-1 mr-2">
                <CameraOff size={13} />
                <span className="text-[11px] font-medium">Face camera</span>
              </div>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-1.5 rounded-full text-white hover:bg-white/10 hover:text-blue-400 transition-all duration-200"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              type="button"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Center play button (shown when paused) */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isPlaying || isLoading || error ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={togglePlay}
      >
        <button
          disabled={faceBlocked}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
            faceBlocked
              ? 'bg-surface-500/50 cursor-not-allowed'
              : 'bg-brand-600/80 hover:bg-brand-600 hover:scale-105 cursor-pointer shadow-lg shadow-brand-600/20'
          }`}
          aria-label={faceBlocked ? 'Face required to play' : 'Play'}
          type="button"
        >
          <Play size={28} className="text-white" />
          {!faceBlocked && (
            <div className="absolute inset-0 rounded-full animate-ping bg-brand-400/20" />
          )}
        </button>
      </div>

      {/* Face-blocked full overlay message */}
      {!isPlaying && !isLoading && !error && faceBlocked && (
        <div className="absolute top-4 right-16 flex items-center gap-2 text-white bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-yellow-500/20">
          <CameraOff size={16} className="text-yellow-400 shrink-0" />
          <p className="text-xs">Face the camera to continue</p>
        </div>
      )}
    </div>
  );
};

VideoPlayer.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
  title: PropTypes.string,
  autoPlay: PropTypes.bool,
  onEnded: PropTypes.func,
  onPlay: PropTypes.func,
  videoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onUploadFlowDone: PropTypes.func,
};

export default VideoPlayer;

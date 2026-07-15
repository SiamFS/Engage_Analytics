import React, { useState, useEffect, useContext } from 'react';
import { Clock, TrendingUp, ThumbsUp, Star } from 'lucide-react';
import ApiService from '../../../utils/ApiService';
import { AuthContext } from '../../../contexts/AuthProvider/AuthProvider';
import { 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '../VideoLoadingStates/VideoLoadingStates';
import HeroBillboard from '../HeroBillboard/HeroBillboard';
import AdRow from '../AdRow/AdRow';

const LoggedInView = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [popularVideos, setPopularVideos] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [pointsData, setPointsData] = useState(null);
  
  useEffect(() => {
    if (user?.role === 'user') {
      ApiService.get('user/points/').then(res => {
        if (res?.points !== undefined) setPointsData(res);
      }).catch(() => {});
    }
  }, [user]);
  
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [featuredResponse, recentResponse, trendingResponse, recommendedResponse] = 
          await Promise.allSettled([
            ApiService.get('featured-carousel/?limit=5'),
            ApiService.get('recent-videos/?limit=8'),
            ApiService.get('popular-videos/?limit=8'),
            ApiService.get('recommendations/?limit=8')
          ]);
        
        if (featuredResponse.status === 'fulfilled') {
          const data = Array.isArray(featuredResponse.value) ? featuredResponse.value : [];
          setFeaturedVideos(data);
        }

        const seenIds = new Set();

        if (recentResponse.status === 'fulfilled') {
          const data = Array.isArray(recentResponse.value) ? recentResponse.value : [];
          const deduped = data.filter(v => !seenIds.has(v.id));
          deduped.forEach(v => seenIds.add(v.id));
          setRecentVideos(deduped);
        }
        
        if (trendingResponse.status === 'fulfilled') {
          const data = Array.isArray(trendingResponse.value) ? trendingResponse.value : [];
          const deduped = data.filter(v => !seenIds.has(v.id));
          deduped.forEach(v => seenIds.add(v.id));
          setPopularVideos(deduped);
        }
        
        if (recommendedResponse.status === 'fulfilled') {
          const data = Array.isArray(recommendedResponse.value) ? recommendedResponse.value : [];
          const deduped = data.filter(v => !seenIds.has(v.id));
          deduped.forEach(v => seenIds.add(v.id));
          setRecommendedVideos(deduped);
        }
        
      } catch (error) {
        console.error('Error fetching videos:', error);
        setError(error.message || 'Failed to load videos. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadVideos();
  }, []);
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    return <ErrorState error={error} onDismiss={() => setError(null)} />;
  }
  
  if (
    !featuredVideos.length && 
    !recentVideos.length && 
    !popularVideos.length && 
    !recommendedVideos.length
  ) {
    return (
      <EmptyState 
        title="No Public Videos Available"
      />
    );
  }
  
  return (
    <div className="bg-surface px-4 py-6 md:px-8 md:py-10 min-h-screen">
      {featuredVideos && featuredVideos.length > 0 && (
        <div>
          <HeroBillboard videos={featuredVideos} />
        </div>
      )}

      {pointsData && pointsData.points > 0 && (
        <div className="mb-8 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl px-4 py-2.5">
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-200 text-sm">
            You have <span className="text-yellow-400 font-bold">{pointsData.points} points</span>
            {pointsData.points_value > 0 && (
              <span> — worth <span className="text-green-400 font-bold">{pointsData.points_value} BDT</span></span>
            )}
          </span>
        </div>
      )}
      
      <div className="space-y-12">
        {recommendedVideos && recommendedVideos.length > 0 && (
          <AdRow 
            title="Recommended For You" 
            icon={<ThumbsUp size={24} className="text-emerald-400" />}
            ads={recommendedVideos}
            linkTo="/videos?type=foryou"
            isVideoSection={true}
          />
        )}
        
        {recentVideos && recentVideos.length > 0 && (
          <AdRow 
            title="Recently Added" 
            icon={<Clock size={24} className="text-brand-400" />}
            ads={recentVideos}
            linkTo="/videos?sort=newest"
            isVideoSection={true}
          />
        )}
        
        {popularVideos && popularVideos.length > 0 && (
          <AdRow 
            title="Popular Videos" 
            icon={<TrendingUp size={24} className="text-purple-400" />}
            ads={popularVideos}
            linkTo="/videos?sort=popular"
            isVideoSection={true}
          />
        )}
      </div>
    </div>
  );
};

export default LoggedInView;

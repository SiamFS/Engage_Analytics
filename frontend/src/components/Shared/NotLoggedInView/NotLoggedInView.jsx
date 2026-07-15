import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Camera, Brain, Shield, ChevronRight, Star, Award, Target, Users, TrendingUp } from 'lucide-react';

const NotLoggedInView = () => {
  const navigate = useNavigate();

  const handleGetStarted = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden py-8">
      <div className="absolute top-10 -left-40 w-96 h-96 bg-brand-600 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      
      <div className="max-w-5xl w-full z-10 px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-white">
            Understand how viewers <span className="text-brand-400">really feel</span> about your videos
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Facial emotion analytics for video ads. Go beyond clicks and views — measure joy, surprise, confusion, and more.
          </p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white text-lg font-medium rounded-full shadow-lg transition-all duration-300 inline-flex items-center"
            type="button"
          >
            Get Started <ChevronRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">Why Use EngageAnalytics?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-brand-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target size={28} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Know What Works</h3>
              <p className="text-gray-400 text-sm">See exactly which moments spark joy or confusion. Optimize your content based on real emotional feedback.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Understand Your Audience</h3>
              <p className="text-gray-400 text-sm">Break down emotional responses and discover which parts of your ad connect most with viewers.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={28} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Improve ROI</h3>
              <p className="text-gray-400 text-sm">Data-driven creative decisions lead to better ad performance and higher engagement.</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">1</div>
              <div className="mb-3 mt-2"><Camera size={28} className="text-brand-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload &amp; Share</h3>
              <p className="text-gray-400 text-sm">Upload your video ad and invite viewers to watch with their webcam on. Recordings are stored securely.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">2</div>
              <div className="mb-3 mt-2"><Brain size={28} className="text-purple-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Emotion Analysis</h3>
              <p className="text-gray-400 text-sm">Our AI analyzes facial expressions frame by frame, detecting seven emotion states throughout the video.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">3</div>
              <div className="mb-3 mt-2"><BarChart3 size={28} className="text-green-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">View Results</h3>
              <p className="text-gray-400 text-sm">Access per-video dashboards with emotional timelines, distribution charts, and engagement metrics.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">4</div>
              <div className="mb-3 mt-2"><Shield size={28} className="text-amber-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">Privacy First</h3>
              <p className="text-gray-400 text-sm">Viewer identities remain anonymous. Only face crops are analyzed — raw recordings stay encrypted and private.</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">Earn Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star size={24} className="text-yellow-400 fill-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload Videos</h3>
              <p className="text-gray-400 text-sm">Earn <span className="text-yellow-400 font-bold">10 points</span> per video upload.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Camera size={24} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Watch with Webcam</h3>
              <p className="text-gray-400 text-sm">Earn <span className="text-yellow-400 font-bold">5 points</span> per video watched with webcam on.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Award size={24} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Redeem Points</h3>
              <p className="text-gray-400 text-sm">Convert at <span className="text-green-400 font-bold">10 BDT per point</span>. Track earnings on your dashboard.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white text-lg font-medium rounded-full shadow-lg transition-all duration-300 inline-flex items-center"
            type="button"
          >
            Get Started <ChevronRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotLoggedInView;

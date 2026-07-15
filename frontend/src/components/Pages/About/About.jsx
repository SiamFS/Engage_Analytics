import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, PieChart, Activity, Video, Camera, Brain, Shield, ChevronRight, Star, Award, Users, Target, TrendingUp, ThumbsUp } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-surface relative overflow-hidden">
      <div className="absolute top-10 -left-40 w-96 h-96 bg-brand-600 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-purple-600 opacity-20 rounded-full filter blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-600 opacity-10 rounded-full filter blur-3xl" />

      <div className="max-w-5xl w-full z-10 px-6 py-20">
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-6">
            <BarChart3 size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            About <span className="text-brand-400">EngageAnalytics</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Understand how viewers truly feel about your video ads — with real emotion data, not just clicks and views.
          </p>
        </div>

        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-brand-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target size={28} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Know What Works</h3>
              <p className="text-gray-400 text-sm">
                See exactly which parts of your video spark joy, surprise, or confusion.
              </p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Understand Your Audience</h3>
              <p className="text-gray-400 text-sm">
                Break down emotional responses by viewer segment.
              </p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={28} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Improve ROI</h3>
              <p className="text-gray-400 text-sm">
                Data-driven creative decisions lead to better ad performance.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">1</div>
              <div className="mb-3 mt-2"><Camera size={28} className="text-brand-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload &amp; Share</h3>
              <p className="text-gray-400 text-sm">Upload your video ad and invite viewers to watch with their webcam on. Their reactions are recorded securely.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">2</div>
              <div className="mb-3 mt-2"><Brain size={28} className="text-purple-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Emotion Analysis</h3>
              <p className="text-gray-400 text-sm">Our AI analyses facial expressions frame by frame, detecting seven emotion states throughout the video.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">3</div>
              <div className="mb-3 mt-2"><BarChart3 size={28} className="text-green-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">View Results</h3>
              <p className="text-gray-400 text-sm">Access per-video dashboards with emotional timelines, distribution charts, and viewer engagement metrics.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 relative">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-bold text-white">4</div>
              <div className="mb-3 mt-2"><Shield size={28} className="text-amber-400" /></div>
              <h3 className="text-lg font-semibold text-white mb-2">Privacy First</h3>
              <p className="text-gray-400 text-sm">Viewer identities remain anonymous. Only face crops are analyzed — raw recordings stay encrypted and private.</p>
            </div>
          </div>
        </div>

        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-white text-center">Rewards &amp; Points</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star size={24} className="text-yellow-400 fill-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload Videos</h3>
              <p className="text-gray-400 text-sm mb-3">Earn <span className="text-yellow-400 font-bold">10 points</span> for each video you upload to the platform.</p>
              <p className="text-xs text-gray-500">One-time reward per video upload.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Camera size={24} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Watch with Webcam</h3>
              <p className="text-gray-400 text-sm mb-3">Earn <span className="text-yellow-400 font-bold">10 points</span> for each video you watch with your webcam enabled.</p>
              <p className="text-xs text-gray-500">One-time reward per video view.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ThumbsUp size={24} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Rate Ads</h3>
              <p className="text-gray-400 text-sm mb-3">Earn <span className="text-yellow-400 font-bold">3 points</span> for sharing your feedback on advertisements.</p>
              <p className="text-xs text-gray-500">Optional — submit after watching with webcam.</p>
            </div>
            <div className="card-base bg-elevated border-elevated-border p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Award size={24} className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Redeem Rewards</h3>
              <p className="text-gray-400 text-sm mb-3">Convert your points at a rate of <span className="text-green-400 font-bold">10 BDT per point</span>.</p>
              <p className="text-xs text-gray-500">Track your earnings on the dashboard.</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">Ready to see how your audience really feels?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Sign up free and start measuring emotional engagement in your video ads today.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-full shadow-lg transition-all duration-300 flex items-center mx-auto"
            type="button"
          >
            Get Started <ChevronRight className="ml-2 w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default About;

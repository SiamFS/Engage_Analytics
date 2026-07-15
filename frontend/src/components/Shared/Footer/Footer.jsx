import React from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

const MainFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-surface border-t border-elevated-border">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-1.5 rounded-lg shrink-0">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Engage Analytics</span>
            <span className="text-xs text-gray-600 hidden sm:inline">|</span>
            <span className="text-xs text-gray-500 hidden sm:inline">Video emotion analytics platform</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <Link to="/about" className="hover:text-brand-400 transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-400 transition-colors">Terms</Link>
            <span className="text-gray-600">&copy; {currentYear}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MainFooter;

import React from 'react';
import { LeaderboardView } from './LeaderboardView';

export const CreatorLeaderboardPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <LeaderboardView isAdminView={false} />
    </div>
  );
};

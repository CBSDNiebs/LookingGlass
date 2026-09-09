import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { computeBinsByKind, OtrEvent } from '../utils/chartUtils';

interface ChartProps {
  events: OtrEvent[];
  durationMs: number;
  mode: string;
}

export default function Chart({ events, durationMs, mode }: ChartProps) {
  const data = computeBinsByKind(events, durationMs);

  if (mode === 'Praise') {
    return (
      <div className="w-full flex flex-col">
        <h4 className="text-center font-bold text-gray-800 mb-4">Praise & Feedback Timeline</h4>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="minute" 
                label={{ value: 'Time (Minutes)', position: 'insideBottom', offset: -20, style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <YAxis 
                allowDecimals={false}
                label={{ value: 'Count per Minute', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="specific" stroke="#1f9d55" name="Specific Praise" isAnimationActive={false} />
              <Line type="monotone" dataKey="general" stroke="#86efac" name="General Praise" isAnimationActive={false} />
              <Line type="monotone" dataKey="corrective" stroke="#3b82f6" name="Corrective Feedback" isAnimationActive={false} />
              <Line type="monotone" dataKey="redirect" stroke="#f97316" name="Redirective Statements" isAnimationActive={false} />
              <Line type="monotone" dataKey="genCrit" stroke="#ef4444" name="General Criticism" isAnimationActive={false} />
              <Line type="monotone" dataKey="indCrit" stroke="#b91c1c" name="Individual Criticism" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (mode === 'Engagement') {
    return (
      <div className="w-full flex flex-col">
        <h4 className="text-center font-bold text-gray-800 mb-4">Engagement Timeline</h4>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="minute" 
                label={{ value: 'Time (Minutes)', position: 'insideBottom', offset: -20, style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <YAxis 
                allowDecimals={false}
                label={{ value: 'Count per Minute', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
              />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="engWhole" stroke="#0369a1" name="Whole Group" isAnimationActive={false} />
              <Line type="monotone" dataKey="engSmall" stroke="#0284c7" name="Small Group" isAnimationActive={false} />
              <Line type="monotone" dataKey="engPartners" stroke="#38bdf8" name="Precision Partners" isAnimationActive={false} />
              <Line type="monotone" dataKey="engChoral" stroke="#d97706" name="Choral Response" isAnimationActive={false} />
              <Line type="monotone" dataKey="engCloze" stroke="#f59e0b" name="Cloze Reading" isAnimationActive={false} />
              <Line type="monotone" dataKey="engWhiteboard" stroke="#fbbf24" name="White Board" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <h4 className="text-center font-bold text-gray-800 mb-4">OTRs Timeline</h4>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="minute" 
              label={{ value: 'Time (Minutes)', position: 'insideBottom', offset: -20, style: { fontSize: 12, fontWeight: 'bold' } }}
            />
            <YAxis 
              allowDecimals={false}
              label={{ value: 'Count per Minute', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontWeight: 'bold' } }}
            />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="group" stroke="#a855f7" name="Whole Group" isAnimationActive={false} />
            <Line type="monotone" dataKey="warm" stroke="#0b2a6f" name="Warm Call" isAnimationActive={false} />
            <Line type="monotone" dataKey="cold" stroke="#1a4fff" name="Cold Call" isAnimationActive={false} />
            <Line type="monotone" dataKey="volunteer" stroke="#9fb8ff" name="Volunteer" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

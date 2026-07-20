"use client";
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ComposedChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, ReferenceLine, Legend,
} from 'recharts';
import { MacroDataPoint, MacroSeries, MacroAnnotation, ChartType, MULTI_SERIES_TYPES, POINT_TYPES } from './types';
import { pivotSeriesData, toStackedPercent } from '@/lib/macroHelpers';

const AXIS_STYLE = { stroke: 'rgba(255,255,255,0.3)', fontSize: 10 };
const TOOLTIP_STYLE = { backgroundColor: '#020111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' };

// ⬇️ FIX : clé de série cohérente avec pivotSeriesData (fallback 'Valeur')
const seriesKey = (s: MacroSeries) => s.name_fr || 'Valeur';

export default function ChartPreview({
  chartType, series, dataPoints, annotations,
}: {
  chartType: ChartType;
  series: MacroSeries[];
  dataPoints: MacroDataPoint[];
  annotations: MacroAnnotation[];
}) {
  const isMultiSeries = MULTI_SERIES_TYPES.includes(chartType);
  const isPointMode = POINT_TYPES.includes(chartType);

  if (dataPoints.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-500">Ajoutez des données pour voir l'aperçu</div>;
  }

  const renderAnnotations = () => {
    if (!annotations || annotations.length === 0) return null;
    return annotations.map(a => (
      <ReferenceLine 
        key={a.id} 
        x={a.period} 
        stroke={a.color || '#D4AF37'} 
        strokeDasharray="3 3" 
        label={{ value: a.label_fr, fill: a.color || '#D4AF37', position: 'insideTopLeft', fontSize: 10, fontWeight: 'bold' }} 
      />
    ));
  };

  if (isMultiSeries) {
    let rows = pivotSeriesData(dataPoints, series);
    const seriesNames = series.map(seriesKey);

    if (chartType === 'stacked_bar_100') rows = toStackedPercent(rows, seriesNames);

    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rows}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={10} />
            <PolarRadiusAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
            {series.map(s => (
              <Radar key={s.id} name={seriesKey(s)} dataKey={seriesKey(s)} stroke={s.color} fill={s.color} fillOpacity={0.3} />
            ))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'population_pyramid') {
      const pRows = rows.map(r => {
        const newRow: any = { name: r.name };
        seriesNames.forEach((n, i) => { newRow[n] = i === 0 ? -Math.abs(r[n] || 0) : Math.abs(r[n] || 0); });
        return newRow;
      });
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pRows} layout="vertical" stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" {...AXIS_STYLE} />
            <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={60} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => Math.abs(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {renderAnnotations()}
            {series.map(s => <Bar key={s.id} dataKey={seriesKey(s)} fill={s.color} stackId="pyramid" />)}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'multi_line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {renderAnnotations()}
            {series.map(s => <Line key={s.id} type="monotone" dataKey={seriesKey(s)} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />)}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'combo') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis yAxisId="left" {...AXIS_STYLE} />
            <YAxis yAxisId="right" orientation="right" {...AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {renderAnnotations()}
            {series.map(s => s.render_as === 'bar'
              ? <Bar key={s.id} yAxisId={s.axis === 'secondary' ? 'right' : 'left'} dataKey={seriesKey(s)} fill={s.color} radius={[4,4,0,0]} />
              : <Line key={s.id} yAxisId={s.axis === 'secondary' ? 'right' : 'left'} type="monotone" dataKey={seriesKey(s)} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} unit={chartType === 'stacked_bar_100' ? '%' : ''} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {renderAnnotations()}
          {series.map(s => <Bar key={s.id} dataKey={seriesKey(s)} stackId="a" fill={s.color} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (isPointMode) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" dataKey="x_value" {...AXIS_STYLE} name="X" />
          <YAxis type="number" dataKey="y_value" {...AXIS_STYLE} name="Y" />
          {chartType === 'bubble' && <ZAxis type="number" dataKey="size_value" range={[50, 500]} />}
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={TOOLTIP_STYLE} />
          {renderAnnotations()}
          <Scatter data={dataPoints} fill="#14b8a6">
            {dataPoints.map((dp, i) => <Cell key={i} fill={dp.color} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'waterfall') {
    let cumulative = 0;
    const wRows = dataPoints.map(dp => {
      const start = cumulative;
      const val = dp.value || 0;
      cumulative += dp.is_total ? 0 : val;
      const end = dp.is_total ? val : cumulative;
      const base = Math.min(start, end);
      const height = Math.abs(end - start);
      return { name: dp.label_fr, base, height, color: dp.color, isNegative: end < start };
    });
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={wRows}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {renderAnnotations()}
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="height" stackId="w" radius={[3,3,0,0]}>
            {wRows.map((r, i) => <Cell key={i} fill={r.isNegative ? '#ef4444' : r.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const data = dataPoints.map(dp => ({ name: dp.label_fr || '?', value: dp.value || 0, color: dp.color || '#14b8a6', period: dp.period }));

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {renderAnnotations()}
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="period" {...AXIS_STYLE} />
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {renderAnnotations()}
          <Line type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, fill: '#D4AF37' }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={chartType === 'donut' ? 60 : 0} outerRadius={80} paddingAngle={2}>
          {data.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.5)" />)}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
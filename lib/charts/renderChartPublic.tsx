"use client";
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis, ReferenceLine, AreaChart, Area,
  LabelList
} from 'recharts';
import { MacroDataPoint, MacroSeries, MacroAnnotation, ChartType } from '@/components/admin/macro/types';
import { pivotSeriesData, toStackedPercent } from '@/lib/macroHelpers';

interface RenderChartProps {
  chartType: ChartType;
  dataPoints: MacroDataPoint[];
  series: MacroSeries[];
  annotations: MacroAnnotation[];
  unit: string;
  secondaryUnit?: string;
  lang: 'fr' | 'en';
  isLarge?: boolean;
}

const AXIS_STYLE = { stroke: 'rgba(255,255,255,0.3)', fontSize: 10 };
const TOOLTIP_STYLE = { backgroundColor: '#020111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' };

// ⬇️ FIX Bug 2 : clé de série toujours cohérente avec pivotSeriesData
const seriesKey = (s: MacroSeries) => s.name_fr || 'Valeur';

// ✅ NOUVEAU : nom affiché selon la langue (pour légende et tooltip)
const seriesName = (s: MacroSeries, lang: 'fr' | 'en') => 
  lang === 'fr' ? (s.name_fr || 'Valeur') : (s.name_en || s.name_fr || 'Valeur');

export default function RenderChartPublic({
  chartType, dataPoints, series, annotations, unit, secondaryUnit, lang, isLarge = false,
}: RenderChartProps) {
  if (dataPoints.length === 0) {
    return <div className="h-full flex items-center justify-center text-white/20 text-sm">
      {lang === 'fr' ? 'Aucune donnée' : 'No data'}
    </div>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#020111]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl z-50">
          {payload.map((entry: any, idx: number) => (
            <div key={idx}>
              <p className="text-white/60 text-xs mb-1 font-mono uppercase">{entry.name || label}</p>
              <p className="text-[#D4AF37] font-bold text-sm">
                {new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US').format(entry.value)}
                <span className="text-xs ml-1 text-white/50">{entry.unit || unit}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const margin = isLarge ? { top: 30, right: 40, bottom: 30, left: 20 } : { top: 20, right: 10, bottom: 20, left: -20 };
  const fontSize = isLarge ? 12 : 10;

  // ⬇️ FIX Bug 1 : helper partagé pour afficher les repères sur TOUS les types de graphiques concernés
  const renderAnnotations = () => {
    if (!annotations || annotations.length === 0) return null;
    return annotations.map(a => (
      <ReferenceLine
        key={a.id}
        x={a.period}
        stroke={a.color || '#D4AF37'}
        strokeDasharray="3 3"
        label={{
          value: lang === 'fr' ? a.label_fr : (a.label_en || a.label_fr),
          fill: a.color || '#D4AF37',
          fontSize: fontSize - 2,
          fontWeight: 'bold',
          position: 'insideTopLeft',
        }}
      />
    ));
  };

  // ============================================================================
  // MULTI-SÉRIES
  // ============================================================================
  if (['stacked_bar', 'stacked_bar_100', 'multi_line', 'combo', 'radar', 'population_pyramid'].includes(chartType)) {
    let rows = pivotSeriesData(dataPoints, series);
    const seriesNames = series.map(seriesKey);

    if (chartType === 'stacked_bar_100') rows = toStackedPercent(rows, seriesNames);

    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rows}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={fontSize} />
            <PolarRadiusAxis stroke="rgba(255,255,255,0.2)" fontSize={fontSize - 2} />
            {series.map(s => (
              <Radar 
                key={s.id} 
                name={seriesName(s, lang)} 
                dataKey={seriesKey(s)} 
                stroke={s.color} 
                fill={s.color} 
                fillOpacity={0.3} 
                isAnimationActive={false} 
              />
            ))}
            <Legend wrapperStyle={{ fontSize: fontSize + 1 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'population_pyramid') {
      const pRows = rows.map(r => {
        const newRow: any = { name: r.name };
        seriesNames.forEach((n, i) => {
          newRow[n] = i === 0 ? -Math.abs(r[n] || 0) : Math.abs(r[n] || 0);
        });
        return newRow;
      });
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={pRows} layout="vertical" stackOffset="sign" margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" {...AXIS_STYLE} />
            <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={60} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => Math.abs(v)} />
            <Legend wrapperStyle={{ fontSize }} />
            {renderAnnotations()}
            {series.map(s => (
              <Bar 
                key={s.id} 
                name={seriesName(s, lang)} 
                dataKey={seriesKey(s)} 
                fill={s.color} 
                stackId="pyramid" 
                isAnimationActive={false} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'multi_line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} fontSize={fontSize} />
            <YAxis {...AXIS_STYLE} fontSize={fontSize} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize }} />
            {series.map(s => (
              <Line 
                key={s.id} 
                type="monotone" 
                name={seriesName(s, lang)} 
                dataKey={seriesKey(s)} 
                stroke={s.color} 
                strokeWidth={isLarge ? 3 : 2.5} 
                dot={{ r: 3 }} 
                isAnimationActive={false} 
              />
            ))}
            {renderAnnotations()}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'combo') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" {...AXIS_STYLE} fontSize={fontSize} />
            <YAxis yAxisId="left" {...AXIS_STYLE} fontSize={fontSize} label={{ value: unit, angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" {...AXIS_STYLE} fontSize={fontSize} label={{ value: secondaryUnit || unit, angle: 90, position: 'insideRight' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize }} />
            {renderAnnotations()}
            {series.map(s => s.render_as === 'bar'
              ? <Bar 
                  key={s.id} 
                  yAxisId={s.axis === 'secondary' ? 'right' : 'left'} 
                  name={seriesName(s, lang)} 
                  dataKey={seriesKey(s)} 
                  fill={s.color} 
                  radius={[4,4,0,0]} 
                  isAnimationActive={false} 
                />
              : <Line 
                  key={s.id} 
                  yAxisId={s.axis === 'secondary' ? 'right' : 'left'} 
                  name={seriesName(s, lang)} 
                  type="monotone" 
                  dataKey={seriesKey(s)} 
                  stroke={s.color} 
                  strokeWidth={isLarge ? 3 : 2.5} 
                  dot={{ r: 3 }} 
                  isAnimationActive={false} 
                />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // stacked_bar / stacked_bar_100
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} fontSize={fontSize} />
          <YAxis {...AXIS_STYLE} fontSize={fontSize} unit={chartType === 'stacked_bar_100' ? '%' : ''} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize }} />
          {renderAnnotations()}
          {series.map(s => (
            <Bar 
              key={s.id} 
              name={seriesName(s, lang)} 
              dataKey={seriesKey(s)} 
              stackId="a" 
              fill={s.color} 
              isAnimationActive={false} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ============================================================================
  // SCATTER / BUBBLE
  // ============================================================================
  if (chartType === 'scatter' || chartType === 'bubble') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" dataKey="x_value" {...AXIS_STYLE} fontSize={fontSize} name="X" />
          <YAxis type="number" dataKey="y_value" {...AXIS_STYLE} fontSize={fontSize} name="Y" />
          {chartType === 'bubble' && <ZAxis type="number" dataKey="size_value" range={[50, 500]} />}
          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={TOOLTIP_STYLE} />
          {renderAnnotations()}
          <Scatter data={dataPoints} isAnimationActive={false}>
            {dataPoints.map((dp, i) => <Cell key={i} fill={dp.color || '#14b8a6'} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ============================================================================
  // WATERFALL
  // ============================================================================
  if (chartType === 'waterfall') {
    let cumulative = 0;
    const wRows = dataPoints.map(dp => {
      const start = cumulative;
      const val = dp.value || 0;
      cumulative += dp.is_total ? 0 : val;
      const end = dp.is_total ? val : cumulative;
      return { name: dp.label_fr, base: Math.min(start, end), height: Math.abs(end - start), color: dp.color, isNegative: end < start };
    });
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={wRows} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} fontSize={fontSize} />
          <YAxis {...AXIS_STYLE} fontSize={fontSize} />
          <Tooltip content={<CustomTooltip />} />
          {renderAnnotations()}
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="height" stackId="w" radius={[3,3,0,0]} isAnimationActive={false}>
            {wRows.map((r, i) => <Cell key={i} fill={r.isNegative ? '#ef4444' : r.color} />)}
            <LabelList dataKey="height" position="top" fill="rgba(255,255,255,0.7)" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ============================================================================
  // SIMPLE : bar / line / pie / donut
  // ============================================================================
  const data = dataPoints.map(dp => ({
    name: lang === 'fr' ? (dp.label_fr || '?') : (dp.label_en || dp.label_fr || '?'),
    value: dp.value || 0,
    color: dp.color || '#14b8a6',
    period: dp.period,
  }));

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="name" {...AXIS_STYLE} fontSize={fontSize} />
          <YAxis {...AXIS_STYLE} fontSize={fontSize} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          {renderAnnotations()}
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" fill="rgba(255,255,255,0.8)" fontSize={10} />
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="period" {...AXIS_STYLE} fontSize={fontSize} />
          <YAxis {...AXIS_STYLE} fontSize={fontSize} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={isLarge ? 4 : 3} dot={{ r: 4, fill: '#D4AF37', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#ffffff', stroke: '#020111', strokeWidth: 2 }} isAnimationActive={false}>
             <LabelList dataKey="value" position="top" fill="rgba(255,255,255,0.8)" fontSize={10} />
          </Line>
          {renderAnnotations()}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie 
          data={data} 
          dataKey="value" 
          nameKey="name" 
          cx="50%" 
          cy="50%" 
          innerRadius={chartType === 'donut' ? (isLarge ? 80 : 60) : 0} 
          outerRadius={isLarge ? 120 : 80} 
          paddingAngle={2} 
          stroke="none"
          isAnimationActive={false}
          labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.5)" />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
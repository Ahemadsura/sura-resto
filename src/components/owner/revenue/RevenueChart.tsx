import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';

interface ChartData {
  [key: string]: any;
}

interface RevenueChartProps {
  data: ChartData[];
  title: string;
  type: 'line' | 'bar';
  height?: number;
  emptyMessage?: string;
  emptySubtitle?: string;
  // Chart customization
  currency?: string;
  revenueDataKey?: string;
  expensesDataKey?: string;
  dateDataKey?: string;
  monthDataKey?: string;
  // Colors and styling
  primaryColor?: string;
  successColor?: string;
  dangerColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  boxShadow?: string;
  // Chart margins
  lineChartMargin?: { top: number; right: number; left: number; bottom: number };
  barChartMargin?: { top: number; right: number; left: number; bottom: number };
  // Background pattern
  backgroundIcon?: string;
  backgroundIconOpacity?: number;
  backgroundIconRotation?: number;
  // Paper styling
  paperPadding?: number;
  paperBackground?: string;
  // Typography
  titleColor?: string;
  titleFontWeight?: string;
  emptyTextColor?: string;
  // Chart specific props
  showGrid?: boolean;
  gridStrokeDasharray?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  // Bar chart specific
  barRadius?: [number, number, number, number];
  // Line chart specific
  lineType?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter' | 'basis' | 'basisOpen' | 'basisClosed' | 'natural' | 'monotoneX' | 'monotoneY';
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  title, 
  type, 
  height = 350,
  emptyMessage = "No data for selected period",
  emptySubtitle = "Try changing the date filter or add some bills/expenses.",
  currency = "₹",
  revenueDataKey = "revenue",
  expensesDataKey = "expenses",
  dateDataKey = "date",
  monthDataKey = "month",
  primaryColor = '#6A1B9A',
  successColor = '#4CAF50',
  dangerColor = '#FF6B6B',
  backgroundColor = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  borderRadius = 3,
  boxShadow = '0 8px 32px rgba(0,0,0,0.1)',
  lineChartMargin = { top: 20, right: 30, left: 0, bottom: 0 },
  barChartMargin = { top: 20, right: 30, left: 20, bottom: 5 },
  backgroundIcon = "📈",
  backgroundIconOpacity = 0.05,
  backgroundIconRotation = 15,
  paperPadding = 3,
  paperBackground = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  titleColor = '#6A1B9A',
  titleFontWeight = 'bold',
  emptyTextColor = '#888',
  showGrid = true,
  gridStrokeDasharray = "3 3",
  showLegend = true,
  showTooltip = true,
  barRadius = [4, 4, 0, 0],
  lineType = 'monotone'
}) => {
  const renderLineChart = () => (
    <LineChart
      data={data}
      margin={lineChartMargin}
    >
      {showGrid && <CartesianGrid strokeDasharray={gridStrokeDasharray} />}
      <XAxis dataKey={dateDataKey} />
      <YAxis tickFormatter={v => v.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
      {showTooltip && (
        <RechartsTooltip
          formatter={(value, name) => [
            typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
            name === revenueDataKey || name === 'Revenue' ? 'Revenue' : 'Expenses'
          ]}
        />
      )}
      {showLegend && <Legend />}
      <Line type={lineType} dataKey={revenueDataKey} stroke={successColor} name="Revenue" />
      <Line type={lineType} dataKey={expensesDataKey} stroke={dangerColor} name="Expenses" />
      <Bar dataKey={revenueDataKey} fill={successColor} opacity={0.2} name="Revenue (Bar)" />
      <Bar dataKey={expensesDataKey} fill={dangerColor} opacity={0.2} name="Expenses (Bar)" />
    </LineChart>
  );

  const renderBarChart = () => (
    <BarChart
      data={data}
      margin={barChartMargin}
    >
      {showGrid && <CartesianGrid strokeDasharray={gridStrokeDasharray} />}
      <XAxis dataKey={monthDataKey} />
      <YAxis tickFormatter={v => `${currency}${v.toLocaleString()}`} />
      {showTooltip && (
        <RechartsTooltip
          formatter={(value, name) => [
            `${currency}${(typeof value === 'number' ? value : 0).toLocaleString()}`,
            name === revenueDataKey ? 'Revenue' : name === expensesDataKey ? 'Expenses' : name
          ]}
        />
      )}
      {showLegend && <Legend />}
      <Bar dataKey={revenueDataKey} fill={successColor} name="Revenue" radius={barRadius} />
      <Bar dataKey={expensesDataKey} fill={dangerColor} name="Expenses" radius={barRadius} />
    </BarChart>
  );

  return (
    <Paper
      sx={{
        p: paperPadding,
        borderRadius,
        background: paperBackground,
        boxShadow,
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        ml: 0,
        pl: 0,
      }}
    >
      {/* Background Pattern */}
      <Box sx={{ 
        position: 'absolute',
        top: -20,
        right: -20,
        fontSize: '8rem',
        opacity: backgroundIconOpacity,
        transform: `rotate(${backgroundIconRotation}deg)`
      }}>
        {backgroundIcon}
      </Box>
      
      <Typography variant="h6" gutterBottom sx={{ 
        color: titleColor, 
        fontWeight: titleFontWeight,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        position: 'relative',
        zIndex: 1
      }}>
        {title}
      </Typography>
      
      <Box sx={{ height: `${height}px`, width: '100%', position: 'relative', zIndex: 1 }}>
        {data.length === 0 ? (
          <Box sx={{ textAlign: 'center', color: emptyTextColor, py: 8 }}>
            <Typography variant="h6">{emptyMessage}</Typography>
            <Typography variant="body2">{emptySubtitle}</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line' ? renderLineChart() : renderBarChart()}
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};

export default RevenueChart; 
import React from "react";
import { Grid, Card, CardContent, Typography, Box } from "@mui/material";

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgDayRevenue: number;
  avgDayRevenueSubtitle: string;
  avgMonthRevenue: number;
  avgMonthRevenueSubtitle: string;
  totalBills: number;
  avgBillValue: number;
  rawMaterialExpense: number;
  upadAsExpense: number;
  staffSalaryExpense: number;
}

interface CardConfig {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  trend: string;
  iconBg: string;
  big?: boolean;
}

interface RevenueDashboardProps {
  analyticsData: AnalyticsData;
  dateFilter: string;
  // Customization props
  currency?: string;
  showStaffSalary?: boolean;
  showAvgDayRevenue?: boolean;
  showAvgMonthRevenue?: boolean;
  // Styling props
  gridColumns?: { xs: string; sm: string; md: string };
  gap?: number;
  marginBottom?: number;
  // Card customization
  cardConfigs?: Partial<CardConfig>[];
  // Colors and themes
  primaryColor?: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
  infoColor?: string;
  secondaryColor?: string;
}

const RevenueDashboard: React.FC<RevenueDashboardProps> = ({ 
  analyticsData, 
  dateFilter,
  currency = "₹",
  showStaffSalary = true,
  showAvgDayRevenue = true,
  showAvgMonthRevenue = true,
  gridColumns = { xs: '1fr', sm: '1fr 1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' },
  gap = 3,
  marginBottom = 3,
  cardConfigs = [],
  primaryColor = '#6A1B9A',
  successColor = '#4CAF50',
  warningColor = '#FFA726',
  dangerColor = '#FF6B6B',
  infoColor = '#1976D2',
  secondaryColor = '#9C27B0'
}) => {
  const defaultCards: CardConfig[] = [
    {
      icon: '💰',
      title: 'Total Revenue',
      value: `${currency}${analyticsData.totalRevenue.toLocaleString()}`,
      subtitle: `${analyticsData.totalBills} orders${dateFilter === 'today' ? ' • Resets daily' : ''}`,
      color: primaryColor,
      bgGradient: `linear-gradient(135deg, ${primaryColor} 0%, #8E24AA 100%)`,
      trend: analyticsData.totalRevenue > 0 ? '+' : '',
      iconBg: '#8E24AA'
    },
    {
      icon: '📉',
      title: 'Total Expenses',
      value: `${currency}${analyticsData.totalExpenses.toLocaleString()}`,
      subtitle: `Raw Material: ${currency}${(analyticsData.rawMaterialExpense || 0).toLocaleString()} • Upad: ${currency}${(analyticsData.upadAsExpense || 0).toLocaleString()}`,
      color: dangerColor,
      bgGradient: `linear-gradient(135deg, ${dangerColor} 0%, #FF8A8A 100%)`,
      trend: analyticsData.totalExpenses > 0 ? '-' : '',
      iconBg: '#FF8A8A'
    },
    ...(showStaffSalary && ['month', 'year', 'custom', 'customYear'].includes(dateFilter) ? [{
      icon: '👨‍🍳',
      title: 'Staff Paid Salary',
      value: `-${currency}${analyticsData.staffSalaryExpense.toLocaleString()}`,
      subtitle: ['month', 'custom'].includes(dateFilter) ? 'For the selected month' : 'For the selected year',
      color: successColor,
      bgGradient: `linear-gradient(135deg, ${successColor} 0%, #45a049 100%)`,
      trend: '',
      iconBg: '#45a049'
    }] : []),
    {
      icon: '📊',
      title: 'Avg Order Value',
      value: `${currency}${analyticsData.avgBillValue.toFixed(0)}`,
      subtitle: 'Per customer transaction',
      color: warningColor,
      bgGradient: `linear-gradient(135deg, ${warningColor} 0%, #FFB74D 100%)`,
      trend: analyticsData.avgBillValue > 0 ? '+' : '',
      iconBg: '#FFB74D'
    },
    ...(showAvgDayRevenue && ["month", "custom"].includes(dateFilter) ? [{
      icon: '📅',
      title: 'Avg Day Revenue',
      value: `${currency}${analyticsData.avgDayRevenue.toFixed(0)}`,
      subtitle: analyticsData.avgDayRevenueSubtitle,
      color: infoColor,
      bgGradient: `linear-gradient(135deg, ${infoColor} 0%, #64B5F6 100%)`,
      trend: analyticsData.avgDayRevenue > 0 ? '+' : '',
      iconBg: '#64B5F6'
    }] : []),
    ...(showAvgMonthRevenue && ["year", "customYear"].includes(dateFilter) ? [{
      icon: '📅',
      title: 'Avg Month Revenue',
      value: `${currency}${analyticsData.avgMonthRevenue.toFixed(0)}`,
      subtitle: analyticsData.avgMonthRevenueSubtitle,
      color: secondaryColor,
      bgGradient: `linear-gradient(135deg, ${secondaryColor} 0%, #BA68C8 100%)`,
      trend: analyticsData.avgMonthRevenue > 0 ? '+' : '',
      iconBg: '#BA68C8'
    }] : []),
    {
      icon: '💹',
      title: 'Net Profit',
      value: `${analyticsData.netProfit > 0 ? '+' : analyticsData.netProfit < 0 ? '-' : ''}${currency}${Math.abs(analyticsData.netProfit).toLocaleString()}`,
      subtitle: `${analyticsData.profitMargin.toFixed(1)}% margin`,
      color: analyticsData.netProfit >= 0 ? '#4ECDC4' : dangerColor,
      bgGradient: analyticsData.netProfit >= 0 
        ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
        : `linear-gradient(135deg, ${dangerColor} 0%, #FF8A8A 100%)`,
      trend: '',
      iconBg: analyticsData.netProfit >= 0 ? '#44A08D' : '#FF8A8A',
      big: true
    }
  ];

  // Merge default cards with custom configs
  const cards = defaultCards
    .map((card, index) => ({
      ...card,
      ...cardConfigs[index]
    }))
    .filter((card): card is NonNullable<typeof card> => card !== null);

  const getFontSize = (valueLength: number) => {
    if (valueLength <= 8) return '2.5rem'; // ₹1,000
    if (valueLength <= 12) return '2rem'; // ₹1,000,000
    if (valueLength <= 16) return '1.5rem'; // ₹1,000,000,000
    if (valueLength <= 20) return '1.25rem'; // ₹1,000,000,000,000
    return '1rem'; // Very large numbers
  };

  const getTrendFontSize = (valueLength: number) => {
    if (valueLength <= 8) return '0.7em';
    if (valueLength <= 12) return '0.6em';
    if (valueLength <= 16) return '0.5em';
    if (valueLength <= 20) return '0.4em';
    return '0.3em';
  };

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: gridColumns, 
      gap, 
      mb: marginBottom
    }}>
      {cards.map((card, index) => (
        <Card 
          key={index}
          sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: card.bgGradient,
            color: 'white',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: `0 15px 35px ${card.color}40`
            }
          }}
        >
          {/* Background Pattern */}
          <Box sx={{ 
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            bgcolor: card.iconBg,
            opacity: 0.2,
            borderRadius: '50%'
          }} />
          <Box sx={{ 
            position: 'absolute',
            bottom: -30,
            right: -30,
            width: 120,
            height: 120,
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: '50%'
          }} />
          
          <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'medium', opacity: 0.9 }}>
                {card.title}
              </Typography>
              <Box sx={{ 
                fontSize: '2.5rem',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}>
                {card.icon}
              </Box>
            </Box>
            
            <Typography 
              sx={{ 
                fontWeight: 'bold', 
                mb: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontSize: getFontSize(card.value.length),
                lineHeight: 1.2,
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {card.trend && (
                <Typography component="span" sx={{ 
                  fontSize: getTrendFontSize(card.value.length),
                  opacity: 0.8 
                }}>
                  {card.trend}
                </Typography>
              )}
              {card.value}
            </Typography>
            
            <Typography variant="body2" sx={{ 
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              {card.subtitle}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default RevenueDashboard; 
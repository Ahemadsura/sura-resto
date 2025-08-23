import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';

interface TopSellingItem {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface TopSellingItemsProps {
  items: TopSellingItem[];
  title?: string;
  // Customization props
  currency?: string;
  maxItems?: number;
  // Styling props
  containerHeight?: number;
  itemPadding?: number;
  borderRadius?: number;
  boxShadow?: string;
  backgroundGradient?: string;
  // Colors and themes
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  secondaryTextColor?: string;
  // Ranking customization
  rankIcons?: string[];
  rankColors?: string[];
  // Empty state
  emptyIcon?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyTextColor?: string;
  // Item styling
  firstItemGradient?: string;
  otherItemGradient?: string;
  firstItemTextColor?: string;
  otherItemTextColor?: string;
  firstItemBorderColor?: string;
  otherItemBorderColor?: string;
  firstItemShadow?: string;
  otherItemShadow?: string;
  hoverTransform?: string;
  hoverShadow?: string;
  // Chip styling
  chipBorderRadius?: number;
  chipFontWeight?: string;
  // Background pattern
  backgroundIcon?: string;
  backgroundIconOpacity?: number;
  backgroundIconRotation?: number;
  // Paper styling
  paperPadding?: number;
  paperBackground?: string;
  paperBorderRadius?: number;
  paperBoxShadow?: string;
}

const TopSellingItems: React.FC<TopSellingItemsProps> = ({ 
  items, 
  title = "🏆 Top Selling Items",
  currency = "₹",
  maxItems = 5,
  containerHeight = 350,
  itemPadding = 2.5,
  borderRadius = 2,
  boxShadow = '0 8px 32px rgba(0,0,0,0.1)',
  backgroundGradient = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  primaryColor = '#6A1B9A',
  secondaryColor = '#8E24AA',
  textColor = '#2c3e50',
  secondaryTextColor = '#6c757d',
  rankIcons = ['🥇', '🥈', '🥉', '🏅', '🏅'],
  rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6A1B9A', '#FF9800'],
  emptyIcon = "🍽️",
  emptyTitle = "No Sales Data Yet",
  emptySubtitle = "Top selling items will appear here\nonce bills are generated",
  emptyTextColor = '#666',
  firstItemGradient = 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
  otherItemGradient = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
  firstItemTextColor = 'white',
  otherItemTextColor = '#2c3e50',
  firstItemBorderColor = 'none',
  otherItemBorderColor = '#e9ecef',
  firstItemShadow = '0 8px 25px rgba(106, 27, 154, 0.3)',
  otherItemShadow = '0 2px 8px rgba(0,0,0,0.05)',
  hoverTransform = 'translateY(-2px)',
  hoverShadow = '0 8px 25px rgba(0,0,0,0.1)',
  chipBorderRadius = 0,
  chipFontWeight = 'bold',
  backgroundIcon = "🏆",
  backgroundIconOpacity = 0.05,
  backgroundIconRotation = -15,
  paperPadding = 3,
  paperBackground = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  paperBorderRadius = 3,
  paperBoxShadow = '0 8px 32px rgba(0,0,0,0.1)'
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <Paper
      sx={{
        p: paperPadding,
        borderRadius: paperBorderRadius,
        background: paperBackground,
        boxShadow: paperBoxShadow,
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
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
        color: primaryColor, 
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        position: 'relative',
        zIndex: 1
      }}>
        {title}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        mt: 2, 
        height: `${containerHeight}px`,
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1
      }}>
        {displayItems.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            color: emptyTextColor 
          }}>
            <Typography sx={{ fontSize: '3rem', mb: 2 }}>{emptyIcon}</Typography>
            <Typography variant="h6" gutterBottom>
              {emptyTitle}
            </Typography>
            <Typography variant="body2" color="textSecondary" textAlign="center">
              {emptySubtitle}
            </Typography>
          </Box>
        ) : (
          displayItems.map((item, index) => (
            <Box key={item.id} sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: itemPadding,
              background: index === 0 ? firstItemGradient : otherItemGradient,
              color: index === 0 ? firstItemTextColor : otherItemTextColor,
              borderRadius,
              border: index === 0 ? firstItemBorderColor : `2px solid ${otherItemBorderColor}`,
              boxShadow: index === 0 ? firstItemShadow : otherItemShadow,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: hoverTransform,
                boxShadow: index === 0 
                  ? '0 12px 35px rgba(106, 27, 154, 0.4)'
                  : hoverShadow
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '1.5rem' }}>
                  {rankIcons[index] || '🏅'}
                </Typography>
                <Box>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 'bold',
                    color: index === 0 ? firstItemTextColor : textColor
                  }}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    opacity: 0.8,
                    color: index === 0 ? 'rgba(255,255,255,0.9)' : secondaryTextColor
                  }}>
                    💰 {currency}{item.revenue.toLocaleString()} revenue
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={`${item.quantity} sold`}
                size="small"
                sx={{ 
                  bgcolor: index === 0 
                    ? 'rgba(255,255,255,0.2)' 
                    : `${rankColors[index]}20`,
                  color: index === 0 
                    ? firstItemTextColor 
                    : rankColors[index],
                  fontWeight: chipFontWeight,
                  borderRadius: chipBorderRadius,
                  border: index === 0 
                    ? '1px solid rgba(255,255,255,0.3)'
                    : `1px solid ${rankColors[index]}40`
                }}
              />
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default TopSellingItems; 
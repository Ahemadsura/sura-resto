import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  FormControl,
  Select,
  MenuItem,
  InputAdornment,
  Chip,
  CircularProgress
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  MenuBook,
  UploadFile
} from "@mui/icons-material";
import { MenuItem as MenuItemType } from "../../../types";
import RefreshButton from "../common/RefreshButton";
import PaginationControls from "../common/PaginationControls";

interface MenuManagementProps {
  menuItems: MenuItemType[];
  paginatedMenuItems: MenuItemType[];
  onEdit: (item: MenuItemType) => void;
  onDelete: (id: string) => void;
  menuPage: number;
  setMenuPage: (page: number | ((prev: number) => number)) => void;
  maxMenuPage: number;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categories: string[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onAddNew?: () => void;
  onImportCsv?: () => void;
  onCategories?: () => void;
  // Customization props
  title?: string;
  subtitle?: string;
  addButtonText?: string;
  importButtonText?: string;
  categoriesButtonText?: string;
  searchPlaceholder?: string;
  categoryLabel?: string;
  totalItemsLabel?: string;
  // Colors and themes
  primaryColor?: string;
  secondaryColor?: string;
  successColor?: string;
  warningColor?: string;
  // Icons
  titleIcon?: string;
  statsIcon?: string;
  // Styling
  titleFontWeight?: string;
  buttonBorderRadius?: number;
  cardBorderRadius?: number;
  // Gradients
  addButtonGradient?: string;
  addButtonHoverGradient?: string;
  statsCardGradient?: string;
  importButtonColor?: string;
  categoriesButtonColor?: string;
  // Shadows
  addButtonShadow?: string;
  statsCardShadow?: string;
  // Sizes
  buttonPadding?: { x: number; y: number };
  buttonFontSize?: string;
  smallButtonFontSize?: string;
}

const MenuManagement: React.FC<MenuManagementProps> = ({
  menuItems,
  paginatedMenuItems,
  onEdit,
  onDelete,
  menuPage,
  setMenuPage,
  maxMenuPage,
  selectedCategory,
  setSelectedCategory,
  categories,
  searchTerm,
  setSearchTerm,
  refreshing = false,
  onRefresh,
  onAddNew,
  onImportCsv,
  onCategories,
  title = "🍽️ Menu Management",
  subtitle = "Manage your restaurant menu items, prices, and availability",
  addButtonText = "Add New Item",
  importButtonText = "Import CSV",
  categoriesButtonText = "Categories",
  searchPlaceholder = "Search menu items...",
  categoryLabel = "Category",
  totalItemsLabel = "Total Menu Items",
  primaryColor = '#6A1B9A',
  secondaryColor = '#8E24AA',
  successColor = '#4CAF50',
  warningColor = '#FF9800',
  titleIcon = "🍽️",
  statsIcon = "📋",
  titleFontWeight = 'bold',
  buttonBorderRadius = 2,
  cardBorderRadius = 0,
  addButtonGradient = 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
  addButtonHoverGradient = 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)',
  statsCardGradient = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
  importButtonColor = '#6A1B9A',
  categoriesButtonColor = '#FF9800',
  addButtonShadow = '0 6px 20px rgba(106, 27, 154, 0.3)',
  statsCardShadow = '0 4px 12px rgba(76, 175, 80, 0.3)',
  buttonPadding = { x: 3, y: 1.5 },
  buttonFontSize = '1rem',
  smallButtonFontSize = '0.875rem'
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: primaryColor, fontWeight: titleFontWeight }}>
              {title}
            </Typography>
            {onRefresh && (
              <RefreshButton onClick={onRefresh} refreshing={refreshing} />
            )}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddNew}
          sx={{ 
            background: addButtonGradient,
            '&:hover': { 
              background: addButtonHoverGradient
            },
            px: buttonPadding.x,
            py: buttonPadding.y,
            borderRadius: buttonBorderRadius,
            boxShadow: addButtonShadow,
            textTransform: 'none',
            fontSize: buttonFontSize
          }}
        >
          {addButtonText}
        </Button>
      </Box>

      {/* Quick Stats & Search */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
        {/* Quick Stats */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2
        }}>
          <Card sx={{ 
            background: statsCardGradient,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: cardBorderRadius,
            boxShadow: statsCardShadow
          }}>
            <Box sx={{ 
              position: 'absolute',
              top: -10,
              right: -10,
              fontSize: '3rem',
              opacity: 0.3
            }}>
              {statsIcon}
            </Box>
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {menuItems.length}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {totalItemsLabel}
              </Typography>
            </CardContent>
          </Card>
          
          {/* Smaller Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadFile />}
              onClick={onImportCsv}
              size="small"
              sx={{
                borderColor: importButtonColor,
                color: importButtonColor,
                fontWeight: 500,
                px: 2,
                py: 0.75,
                borderRadius: buttonBorderRadius,
                textTransform: 'none',
                fontSize: smallButtonFontSize,
                '&:hover': {
                  borderColor: '#4A148C',
                  bgcolor: 'rgba(106, 27, 154, 0.04)'
                }
              }}
            >
              {importButtonText}
            </Button>
            <Button
              variant="outlined"
              startIcon={<MenuBook />}
              onClick={onCategories}
              size="small"
              sx={{
                borderColor: categoriesButtonColor,
                color: categoriesButtonColor,
                fontWeight: 500,
                px: 2,
                py: 0.75,
                borderRadius: buttonBorderRadius,
                textTransform: 'none',
                fontSize: smallButtonFontSize,
                '&:hover': {
                  borderColor: '#F57C00',
                  bgcolor: 'rgba(255, 152, 0, 0.04)'
                }
              }}
            >
              {categoriesButtonText}
            </Button>
          </Box>
        </Box>

        {/* Enhanced Search */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="🔍 Search Menu Items"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#6A1B9A',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6A1B9A',
                },
              },
            }}
          />
          
          {/* Professional Category Filter */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 3,
            p: 3,
            bgcolor: 'white',
            borderRadius: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)'
          }}>
            {/* Filter Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ 
                color: '#1a1a1a', 
                fontWeight: 600,
                fontSize: '1.1rem'
              }}>
                {categoryLabel}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                {menuItems.filter(item => {
                  const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.itemNo.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
                  return matchesSearch && matchesCategory;
                }).length} of {menuItems.length} items
              </Typography>
            </Box>

            {/* Category Tabs */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* All Tab */}
              <Button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchTerm('');
                }}
                variant={selectedCategory === 'All' ? 'contained' : 'text'}
                sx={{
                  minWidth: 'auto',
                  px: 2.5,
                  py: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: selectedCategory === 'All' ? 600 : 500,
                  fontSize: '0.875rem',
                  color: selectedCategory === 'All' ? 'white' : '#6b7280',
                  bgcolor: selectedCategory === 'All' ? primaryColor : 'transparent',
                  boxShadow: selectedCategory === 'All' ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                  '&:hover': {
                    bgcolor: selectedCategory === 'All' ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                    boxShadow: selectedCategory === 'All' ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                All
              </Button>

              {/* Category Tabs */}
              {categories.slice(0, 6).map((category) => {
                const itemCount = menuItems.filter(item => item.category === category).length;
                return (
                  <Button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSearchTerm('');
                    }}
                    variant={selectedCategory === category ? 'contained' : 'text'}
                    sx={{
                      minWidth: 'auto',
                      px: 2.5,
                      py: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: selectedCategory === category ? 600 : 500,
                      fontSize: '0.875rem',
                      color: selectedCategory === category ? 'white' : '#6b7280',
                      bgcolor: selectedCategory === category ? primaryColor : 'transparent',
                      boxShadow: selectedCategory === category ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                      '&:hover': {
                        bgcolor: selectedCategory === category ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                        boxShadow: selectedCategory === category ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {category}
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: selectedCategory === category ? 'rgba(255,255,255,0.2)' : 'rgba(107, 114, 128, 0.1)',
                        color: selectedCategory === category ? 'white' : '#6b7280'
                      }}
                    >
                      {itemCount}
                    </Box>
                  </Button>
                );
              })}

              {/* More Categories Dropdown */}
              {categories.length > 6 && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={categories.slice(6).includes(selectedCategory) ? selectedCategory : ''}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSearchTerm('');
                    }}
                    displayEmpty
                    renderValue={(selected) => selected || 'More Categories'}
                    sx={{
                      borderRadius: 2,
                      bgcolor: 'rgba(107, 114, 128, 0.05)',
                      border: 'none',
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: '1px solid rgba(107, 114, 128, 0.2)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: '1px solid #6A1B9A'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: '2px solid #6A1B9A'
                      },
                      '& .MuiSelect-select': {
                        py: 1,
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }
                    }}
                  >
                    {categories.slice(6).map((category) => {
                      const itemCount = menuItems.filter(item => item.category === category).length;
                      return (
                        <MenuItem key={category} value={category}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{category}</span>
                            <Box
                              component="span"
                              sx={{
                                ml: 1,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: 'rgba(107, 114, 128, 0.1)',
                                color: '#6b7280'
                              }}
                            >
                              {itemCount}
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>Item No</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>Private Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>Loading Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }}>AC Hall Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: primaryColor }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMenuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>#{item.itemNo}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{item.name}</Typography>
                    {item.description && (
                      <Typography variant="caption" color="textSecondary" sx={{ 
                        display: 'block', 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>₹{item.privatePrice}</TableCell>
                <TableCell>₹{item.loadingPrice}</TableCell>
                <TableCell>
                  {(item as any).acHallPrice && (item as any).acHallPrice > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>₹{(item as any).acHallPrice}</span>
                      <Chip label="AC" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565C0', fontSize: '0.7rem', height: 18 }} />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <IconButton onClick={() => onEdit(item)} size="small" sx={{ color: primaryColor }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => onDelete(item.id)} size="small" sx={{ color: '#F44336' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 1 }}>
        <PaginationControls page={menuPage} setPage={setMenuPage} maxPage={maxMenuPage} color={primaryColor} />
      </Box>
    </Box>
  );
};

export default MenuManagement; 
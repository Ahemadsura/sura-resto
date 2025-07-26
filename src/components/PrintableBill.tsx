import React, { forwardRef } from 'react';
import { Bill } from '../types';

interface PrintableBillProps {
  bill: Bill;
  profile: {
    name: string;
    address: string;
    gstin: string;
    phone: string;
    email: string;
  };
}

const PrintableBill = forwardRef<HTMLDivElement, PrintableBillProps>(
  function PrintableBill({ bill, profile }, ref) {
    // Format date as DD/MM/YYYY, HH:mm
    const formatDate = (date: Date | string | undefined) => {
      let d: Date | null = null;
      if (!date) return 'Date Unavailable';
      if (date instanceof Date && !isNaN(date.getTime())) {
        d = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) d = parsed;
      } else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
        try {
          d = date.toDate();
        } catch {
          d = null;
        }
      }
      if (!d || isNaN(d.getTime())) return 'Date Unavailable';
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    };

    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    return (
      <div
        ref={ref}
        className="PrintableBill printable-bill"
        style={{
          width: '320px',
          maxWidth: '320px',
          fontFamily: '"Courier New", Courier, monospace',
          position: 'relative',
          padding: '16px',
          background: '#ffffff',
          color: '#000000',
          border: '2px solid #000000',
          boxSizing: 'border-box',
          lineHeight: '1.4',
          fontSize: '12px',
          margin: '0 auto',
          overflow: 'hidden'
        }}
      >
        {/* Restaurant Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '12px',
          borderBottom: '2px solid #000000',
          paddingBottom: '12px'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {profile.name || 'SURA RESTRO'}
          </div>
          <div style={{ fontSize: '11px', marginBottom: '2px' }}>
            {profile.address || 'Restaurant Address'}
          </div>
          {profile.gstin && (
            <div style={{ fontSize: '11px', marginBottom: '2px' }}>
              GSTIN: {profile.gstin}
            </div>
          )}
          {profile.phone && (
            <div style={{ fontSize: '11px', marginBottom: '2px' }}>
              Phone: {profile.phone}
            </div>
          )}
          {profile.email && (
            <div style={{ fontSize: '11px' }}>
              Email: {profile.email}
            </div>
          )}
        </div>

        {/* Bill Information */}
        <div style={{ 
          marginBottom: '12px',
          borderBottom: '1px dashed #000000',
          paddingBottom: '8px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span style={{ fontWeight: 'bold' }}>BILL NO:</span>
            <span style={{ fontWeight: 'bold' }}>{bill.billNumber}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span>Date:</span>
            <span>{formatDate(bill.createdAt)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span>Table:</span>
            <span style={{ fontWeight: 'bold' }}>{bill.customer?.tableNumber || '-'}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span>Type:</span>
            <span style={{ textTransform: 'uppercase' }}>{bill.customerType}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between'
          }}>
            <span>Hall:</span>
            <span>{(bill as any).hallType === 'ac' ? 'AC HALL' : 'COMMON HALL'}</span>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ 
            borderBottom: '2px solid #000000',
            paddingBottom: '4px',
            marginBottom: '6px'
          }}>
            <div style={{ 
              display: 'flex',
              fontWeight: 'bold',
              fontSize: '11px'
            }}>
              <div style={{ flex: '2', textAlign: 'left' }}>ITEM</div>
              <div style={{ flex: '0.6', textAlign: 'center' }}>QTY</div>
              <div style={{ flex: '0.8', textAlign: 'right' }}>RATE</div>
              <div style={{ flex: '1', textAlign: 'right' }}>AMOUNT</div>
            </div>
          </div>
          
          {bill.items.map((item, idx) => {
            const rate = item.customPrice || (item.customerType === 'private' ? item.menuItem.privatePrice : item.menuItem.loadingPrice);
            const amount = item.quantity * rate;
            return (
              <div key={idx} style={{ 
                display: 'flex',
                marginBottom: '4px',
                fontSize: '11px',
                borderBottom: idx < bill.items.length - 1 ? '1px dotted #cccccc' : 'none',
                paddingBottom: '3px'
              }}>
                <div style={{ 
                  flex: '2', 
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  fontSize: '10px'
                }}>
                  {item.menuItem.name}
                </div>
                <div style={{ flex: '0.6', textAlign: 'center' }}>
                  {item.quantity}
                </div>
                <div style={{ flex: '0.8', textAlign: 'right' }}>
                  {rate.toFixed(2)}
                </div>
                <div style={{ flex: '1', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(amount)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Section */}
        <div style={{ 
          borderTop: '2px solid #000000',
          paddingTop: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span>SUBTOTAL:</span>
            <span style={{ fontWeight: 'bold' }}>{formatCurrency(bill.subtotal)}</span>
          </div>
          
          {bill.discountAmount > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '3px'
            }}>
              <span>DISCOUNT:</span>
              <span style={{ fontWeight: 'bold' }}>-{formatCurrency(bill.discountAmount)}</span>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '3px'
          }}>
            <span>CGST (9%):</span>
            <span>{formatCurrency(bill.taxAmount / 2)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}>
            <span>SGST (9%):</span>
            <span>{formatCurrency(bill.taxAmount / 2)}</span>
          </div>
          
          <div style={{ 
            borderTop: '1px solid #000000',
            paddingTop: '4px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(bill.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '12px',
          fontSize: '11px',
          borderTop: '1px dashed #000000',
          borderBottom: '1px dashed #000000',
          padding: '6px 0'
        }}>
          <div>PAYMENT METHOD: <strong>CASH</strong></div>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          <div style={{ marginBottom: '4px' }}>
            ★ THANK YOU FOR YOUR VISIT ★
          </div>
          <div style={{ fontSize: '10px', fontWeight: 'normal' }}>
            Please visit again!
          </div>
        </div>
      </div>
    );
  }
);

export default PrintableBill; 
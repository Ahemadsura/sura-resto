# SURA-Resto — Restaurant POS & Billing System

A comprehensive restaurant management system built with React, TypeScript, Firebase, and Material UI.

## Features

### 🔐 Authentication System
- Role-based login (Owner/Manager)
- Firebase Authentication
- Protected routes with role verification

### 👨‍💼 Manager Dashboard
- **Billing System**
  - MUI Autocomplete for item search by name or number
  - Customer type selection (Private/Loading)
  - Auto total price calculation
  - Real-time bill creation and management
- **Inventory Management**
  - Search and add items to bills
  - Quantity management
  - Price differentiation based on customer type

### 👑 Owner Dashboard
- **Revenue Analytics**
  - Daily/Monthly revenue charts
  - Total revenue tracking
  - Bills count analytics
  - Interactive charts using MUI X Charts
- **Menu Management**
  - Add/Update/Delete menu items
  - Each item includes: Item No, Name, Private Price, Loading Price
  - Full CRUD operations with Firestore

### 🛠️ Technical Features
- **Firebase Integration**
  - Firestore for data storage
  - Firebase Authentication
  - Firebase Hosting ready
- **Modern UI/UX**
  - Material UI components
  - Responsive design
  - Professional theming
  - Loading states and error handling

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Library**: Material UI (MUI)
- **Charts**: MUI X Charts
- **Backend**: Firebase (Auth + Firestore)
- **Hosting**: Firebase Hosting
- **Routing**: React Router DOM

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Installation

1. **Clone and setup**
   ```bash
   cd sura-resto
   npm install
   ```

2. **Firebase Setup**
   
   a. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   
   b. Enable Authentication and Firestore
   
   c. Update Firebase configuration in `src/config/firebase.ts`:
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```
   
   d. Update project ID in `.firebaserc`:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

3. **Create Users in Firebase Console**
   
   Go to Firebase Console > Authentication > Users and create:
   - Manager user with email/password
   - Owner user with email/password
   
   Then add user documents in Firestore:
   ```
   Collection: users
   Document ID: [user-uid]
   Data: {
     email: "user@example.com",
     role: "manager" // or "owner"
   }
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```

### Firebase Deployment

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

## Usage

### Login
1. Select role (Owner/Manager)
2. Enter email and password
3. System will verify role and redirect to appropriate dashboard

### Manager Dashboard
1. **Create Bills**
   - Search items using autocomplete
   - Select customer type (Private/Loading)
   - Add items with quantities
   - Review bill summary
   - Save completed bills

### Owner Dashboard
1. **View Analytics**
   - Check revenue charts
   - Monitor daily/monthly performance
   - Track total revenue and bill counts

2. **Manage Menu**
   - Add new menu items
   - Edit existing items
   - Delete items
   - Set different prices for Private/Loading customers

## Firestore Data Structure

### Collections

**users**
```json
{
  "uid": "string",
  "email": "string",
  "role": "owner" | "manager"
}
```

**menuItems**
```json
{
  "itemNo": "string",
  "name": "string",
  "privatePrice": "number",
  "loadingPrice": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**bills**
```json
{
  "items": [
    {
      "menuItem": "MenuItem object",
      "quantity": "number",
      "customerType": "private" | "loading"
    }
  ],
  "customerType": "private" | "loading",
  "totalAmount": "number",
  "createdAt": "timestamp",
  "createdBy": "string (user uid)"
}
```

## Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own user document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
    
    // Menu items - owners can CRUD, managers can read
    match /menuItems/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
    }
    
    // Bills - managers can create, owners can read all
    match /bills/{document} {
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager';
      allow read: if request.auth != null;
    }
  }
}
```

## Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `firebase deploy` - Deploy to Firebase Hosting
- `firebase serve` - Serve locally with Firebase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@sura-resto.com or create an issue in the repository.

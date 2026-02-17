# Book Shop Manager 📚

A premium, high-performance React Native application built with Expo for managing book inventory, tracking sales, and monitoring business expenses with robust Excel-based data portability.

![App Header](https://raw.githubusercontent.com/zeekygeek/BookInventory/main/assets/readme-header.png) *Note: Replace with actual screenshot path if available*

## 🌟 Key Features

### 📊 Advanced Analytics
- **Dynamic Dashboards**: Real-time overview of total stock value, revenue, and net profit.
- **Custom Filtering**: Comprehensive date-based filtering (Today, Week, Month, and Custom Date Picker).
- **Profit Tracking**: Automatic calculation of gross and net profit margins.

### 📦 Inventory & Stock Control
- **Itemized Tracking**: Detailed book metadata including ISBN, author, and cost/sell prices.
- **Stock Timing**: "Last Stocked" timestamps displayed for every item.
- **Restock History**: Dedicated audit logs for every stock addition event.
- **Low Stock Alerts**: Visual indicators and dedicated reports for items requiring replenishment.

### 💰 Expense Management
- **Categorized Logging**: Track business costs like Rent, Food, Fuel, and Misc.
- **Financial Integration**: Expenses are automatically subtracted from gross profit for accurate net earnings.

### 💾 Data Portability & Backup
- **Excel Excellence**: Multi-sheet export (`.xlsx`) containing Summary, Books, Sales, Expenses, and Restocks.
- **Smart Restore**: Intelligent import logic that handles both modern and legacy backup formats.
- **Android SAF Support**: Save backups directly to your preferred folder (e.g., Downloads) using the Android Storage Access Framework.
- **Formatted Data**: Date and Time are split into separate columns in exports for better spreadsheet readability.

## 🛠 Tech Stack

- **Core**: [React Native](https://reactnative.dev/) via [Expo SDK 54](https://expo.dev/)
- **Architecture**: Expo Router (File-based navigation)
- **Database**: AsyncStorage (Reliable local persistence)
- **Visuals**: Lucide/Ionicons/Material Icons, Haptic Feedback (Expo Haptics)
- **Data Engine**: `xlsx` for complex spreadsheet generation and parsing
- **Notifications**: `react-native-toast-message` for sleek user feedback

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Expo Go app on your mobile device (for testing)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/zeekygeek/BookInventory.git

# Navigate to project
cd BookInventory

# Install dependencies
npm install
```

### 3. Development
```bash
# Start the Expo server
npx expo start
```
Scan the QR code with your Expo Go app or use the terminal shortcuts (`a` for Android, `i` for iOS).

## 📦 Production Builds

This project is configured for [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
# Build Android APK (Production)
npx eas build --platform android --profile production
```

## 🤝 Contributing
Feel free to fork the project and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

---

*Crafted with precision by Antigravity.*

**Project Name:** Finance-Tracker
**Project Owner:** Talifhani Seaba

## 1. Introduction 

The purpose of this document is to define the main objectives of the system, functional and non functional requirements,Use cases and User stories, Domain model and Architectural requirements for the finance tracker system.

## 1.1 Main Objective 

the main objective is to help users track their income,expenses,savings and financial habits, visualise financial behaviour through analytics dashboards, and make informed financial decisions.


## 2. User stories

* **User:** An individual who wants to manage their personal finances.
* **admin:** A technical user who manages the system.Monitor system performance,manage user accounts. 

### user 

#### Authentication 

* As a user, I want to register an account so that I can securely store my financial data.
* As a user, I want to log into my account so that I can access my dashboard.

#### Transaction management

* As a user, I want to add income transactions so that I can track money I earn.
* As a user, I want to add expense transactions so that I can track my spending.
* As a user, I want to edit transactions so that I can correct mistakes.
* As a user, I want to delete transactions so that I can remove incorrect entries.
* As a user, I want to view all my transactions so that I can review my financial history.
* As a user, I want to categorise transactions so that I can understand my spending habits.

#### Analytics

* As a user, I want to view a financial dashboard so that I can see a summary of my finances.
* As a user, I want to view income vs expense charts so that I can understand my financial balance. (filters: time period and category)

#### Reports

* As a user, I want to generate financial reports so that I can review my finances over time.
* As a user, I want to export my financial reports so that I can use it externally.


### admin

* As an admin, I want to view registered users so that I can monitor system usage.

* As an admin, I want to deactivate user accounts so that I can handle misuse or security issues.

## 3. Use cases 

### use case 1

User Registration 

* **Actor:** User 
* **TUCBW:** The user accesses the registration page then creates the account
* **TUCEW:**  User account is created and redirected to dashboard

### use case 2

login

* **Actor:** User 
* **TUCBW:** User navigates to login pag and enters credentials
* **TUCEW:** User is authenticated successfully and redirected to dashboard

### use case 3 

view dashboard

* **Actor:** User 
* **TUCBW:** User logs into the system, redirected to dashboard
* **TUCEW:** Dashboard is displayed with balanc,income,expenses,savings charts and calendar view

### use case 4

Create, Read, Update, Delete Transcations

* **Actor:** User 
* **TUCBW:** User opens transaction and select action ( add, edit, delete, view)
* **TUCEW:** Transaction is updated and dashboard reflects updated values. 

### use case 5

Categorize transactions

* **Actor:** User 
* **TUCBW:** User selects a transaction and chooses category
* **TUCEW:** catrgory is saved and analytics is updated

### use case 6

Create Budget and receive alerts

* **Actor:** User 
* **TUCBW:** User sets budget limits
* **TUCEW:** Budget is stored, alerts are triggered when exceeded

### use case 7

Create and track savings goals


* **Actor:** User 
* **TUCBW:** User opens savings goal page and enters the details 
* **TUCEW:** Goal is stored and progresses over time

### use case 8

view analytics

* **Actor:** User 
* **TUCBW:** User selects date range and opens analytics
* **TUCEW:** charts and trends are displayed

### use case 9


Generate Monthly Financial Report

* **Actor:** User
* **TUCBW:** User requests report generation
* **TUCEW:** PDF report is generated and downloaded

### use case 10

Alert and Notification system

* **Actor:** System
* **TUCBW:** Budget exceeded and large transaction detected
* **TUCEW:** Notification is delivered to user

### use case 11

Record User Activity

* **Actor:** System
* **TUCBW:** User performs any action
* **TUCEW:** Action is stored in audit log database


## 4. Functional Requirements

### 4.1 Authentication

* The system shall allow users to register an account using email and password.
* The system shall authenticate users securely using login credentials.
* The system shall allow users to log out securely.

### 4.2 Transaction Managing

* The system shall allow users to create income and expense transactions.
* The system shall allow users to read/view all transactions.
* The system shall allow users to update existing transactions.
* The system shall allow users to delete transactions.

### 4.3 Categorization 

* The system shall allow users to assign categories to transactions.
* The system shall support predefined categories such as food, rent, transport, healthcare.
* The system shall allow users to filter transactions by category.

### 4.4 Dashboard

* The system shall display a financial dashboard showing total balance, income, expenses, and savings.
* The system shall display a calendar view of financial activity and upcoming events.
* The system shall display spending breakdown by category.
* The system shall show financial trends over selected date ranges.

### 4.5 Trend analysis

* The system shall analyse transaction data over user-defined date ranges.
* The system shall generate cash flow trends based on income and expenses.
* The system shall support filtering analytics by time period. 

### 4.6 Budget systems

* The system shall allow users to create budgets per category.
* The system shall track user spending against defined budgets.
* The system shall notify users when budget limits are exceeded.

### 4.7 Savings Goals
* The system shall allow users to create savings goals with target amounts and deadlines.
* The system shall track progress toward savings goals.
* The system shall update goal progress based on user transactions.
### 4.8 Report Generation
* The system shall generate monthly financial reports in PDF format.
* The system shall include income, expenses, charts, and insights in reports.
* The system shall allow users to download generated reports.
### 4.9 Notification System
* The system shall send notifications for budget violations.
* The system shall notify users of large transactions.
* The system shall send alerts for savings goal progress updates.
* The system shall notify users when monthly reports are ready.
### 4.10 Audit Logging
* The system shall record all user actions including login, logout, and CRUD operations.
* The system shall log financial changes such as transaction creation, updates, and deletions.
* The system shall maintain timestamped audit trails for all actions.
### 4.11 System Administration
* The system shall allow administrators to view user accounts.
* The system shall allow administrators to monitor system activity logs.
* The system shall allow administrators to manage system access and security controls.

## 5. Non Functional Requirements


### 5.1 Performance Requirements
* The system shall load the dashboard within 2 seconds under normal conditions.
* The system shall support concurrent users without performance degradation.
* The system shall process transactions and update analytics in real-time or near real-time.
### 5.2 Security Requirements
* The system shall encrypt all sensitive user data in transit using HTTPS.
* The system shall hash all user passwords using secure hashing algorithms.
* The system shall implement token-based authentication (e.g., JWT).
* The system shall restrict access to user-specific financial data.
### 5.3 Reliability & Availability
* The system shall maintain 99% uptime under normal operating conditions.
* The system shall recover gracefully from server failures.
* The system shall prevent data loss through reliable database storage.
### 5.4 Usability Requirements
* The system shall provide an intuitive and user-friendly interface.
* The system shall be accessible on both desktop and mobile devices.
* The system shall present financial data using clear and understandable visualisations.
### 5.5 Maintainability
* The system shall follow modular architecture (frontend, backend, analytics separation).
* The system shall support CI/CD automation for testing and deployment.
* The system shall be written in maintainable and documented code.
### 5.6 Scalability
* The system shall support future expansion to multi-user financial platforms.
* The system shall be designed to handle increasing transaction volumes.
* The system shall support integration with external financial APIs in future versions.
### 5.7 Compatibility
* The system shall be compatible with modern web browsers.
* The system shall support cross-platform access (Windows, macOS, mobile browsers).


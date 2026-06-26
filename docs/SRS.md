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

## Use cases 

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
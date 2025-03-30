

---

# **Real-Time Monitoring and Evaluation Software for Fire Department**

### **Overview**  
This project was developed as part of the **Smart India Hackathon (SIH)** to provide a real-time monitoring and evaluation system for the **Fire Department** under the **Government of NCT of Delhi (GNCTD)**. The solution ensures automation in managing applications related to inspections, follow-ups, and issuance of NOCs, eliminating the need for manual intervention. It enhances transparency, streamlines workflows, and improves efficiency.

---

## **Problem Statement**  
**Title**: Real-time monitoring and evaluation software for applications received in the Fire Department relating to inspections, follow-ups, and issuance of NOCs.  

**Description**:  
Developed a **smart automation software** to:  
- Monitor and evaluate applications in real-time.  
- Automate inspections, follow-ups, and licensing requirements.  
- Facilitate a seamless workflow for issuing NOCs with minimal manual support.

**Organization**: Government of NCT of Delhi  
**Department**: IT Department, GNCTD  
**Category**: Software  
**Theme**: Smart Automation  

---

## **Features**  
1. **Citizen Portal**  
   - Developed a web portal using **React.js** and **Node.js** for citizens to:  
     - Apply for NOCs.  
     - Track the status of applications.  
   - Integrated **OCR (Optical Character Recognition)** for automatic document verification.

2. **Mobile App for Inspection Officers**  
   - Built a **Flutter** app to:  
     - Manage inspections.  
     - Submit reports.  
     - View scheduled tasks.  
   - Provides role-based access for inspection officers and department officials.

3. **IoT-Based Fire Detection**  
   - Integrated IoT devices for real-time fire detection.  
   - Alerts sent to the Fire Department via a **REST API**, enhancing safety and response.

4. **Automated Scheduling**  
   - Developed a **PriorityQueue** algorithm in **Node.js** for:  
     - Scheduling inspections and follow-ups.  
     - Prioritizing tasks based on urgency and requirements.

5. **Secure Authentication**  
   - Implemented **MACID-based login** for enhanced security.  
   - Integrated **OTP-based authentication** via **Twilio** and **Firebase**.

6. **Role-Based Access Control**  
   - Ensures secure and appropriate access for citizens, inspection officers, and officials.  

7. **Real-Time Monitoring and Evaluation**  
   - Tracks the status of applications, inspections, and approvals.  
   - Provides insights into pending, completed, and rejected applications.

---

## **Technologies Used**  
- **Frontend**: HTML, CSS, JavaScript, React.js  
- **Backend**: Node.js, REST API  
- **Mobile App**: Flutter  
- **Database**: Firebase  
- **Additional Integrations**:  
  - IoT for fire detection.  
  - OCR for document verification.  
  - **Twilio** for OTP-based authentication.  
  - **MACID** for secure login.  
  - Custom **PriorityQueue** algorithm for task scheduling.  

---

## **Setup**  

### **1. Clone the Repository**  
```bash
git clone https://github.com/your-username/fire-dept-monitoring.git
cd fire-dept-monitoring
```  

### **2. Install Dependencies**  
For the Node.js backend:  
```bash
npm install
```  


### **3. Configure Environment Variables**  
Create a `.env` file in the root directory and populate it with the following configuration:  
```plaintext
PORT=5000
JWT_SECRET=
NODE_ENV=development

FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=

EMAIL_USER=
EMAIL_PASSWORD=
```

### **4. Start the Application**  
To run the Node.js backend:  
```bash
npm start
```   

---

## **Usage**  
### Citizen Portal:  
- Apply for NOCs.  
- Track application progress.  
- Upload documents for verification (via OCR).  

### Mobile App:  
- Manage inspections and view tasks.  
- Submit inspection reports.  

### Fire Department Dashboard:  
- Monitor real-time fire alerts.  
- View and prioritize pending tasks.  
- Manage follow-ups and issue NOCs.

---

## **Contributing**  
We welcome contributions!  
1. Fork the repository.  
2. Create a feature branch:  
   ```bash
   git checkout -b feature-name
   ```  
3. Commit your changes:  
   ```bash
   git commit -m "Add feature or fix issue"
   ```  
4. Push to your forked repository:  
   ```bash
   git push origin feature-name
   ```  
5. Create a Pull Request.  

---

## **License**  
This project is licensed under the [MIT License](LICENSE).  

---

## **Contact**  
For any queries or support, please reach out:  
- **Name**: Gaurav Jikar 
- **Email**: gauravjikar070806@gmail.com  
- **GitHub**: [https://github.com/gaurav0330](https://github.com/gaurav0330)  

---


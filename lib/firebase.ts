
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, Firestore, collection, getDocs, writeBatch, doc, setDoc, query, where } from "firebase/firestore";
import { students, schoolClasses } from "./data";

const firebaseConfig = {
  "projectId": "campusvote-ex3qp",
  "appId": "1:22179505911:web:ce47ebbe79706b869d55f2",
  "storageBucket": "campusvote-ex3qp.firebasestorage.app",
  "apiKey": "AIzaSyAL4pHpJMEcCMbUD7eHWmpZoMYN-ZOja1I",
  "authDomain": "campusvote-ex3qp.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "22179505911"
};

let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

let dbInstancePromise: Promise<Firestore>;

async function initializeDefaultData(db: Firestore) {
    try {
        const classesCollection = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesCollection);
        if (classesSnapshot.empty) {
            console.log("Initializing default classes...");
            const batch = writeBatch(db);
            schoolClasses.forEach(c => {
                const docRef = doc(db, 'classes', c.id);
                batch.set(docRef, c);
            });
            await batch.commit();
            console.log("Default classes initialized.");
        }

        const adminStudent = students.find(s => s.id === 'A001');
        if (adminStudent && adminStudent.password) {
             const studentsCollection = collection(db, 'students');
             const studentDocRef = doc(studentsCollection, adminStudent.id);
             const studentDocSnap = await getDocs(query(studentsCollection, where("id", "==", adminStudent.id)));

             if(studentDocSnap.empty) {
                console.log("Initializing default admin student...");
                await setDoc(studentDocRef, { id: adminStudent.id, classId: adminStudent.classId });
                const adminCredRef = doc(db, "credentials", "admin");
                await setDoc(adminCredRef, { username: 'admin', password: adminStudent.password });
                console.log("Default admin student and credentials initialized.");
             }
        }
    } catch(error) {
        console.error("Failed to initialize default data:", error);
    }
}

async function initializeDb(): Promise<Firestore> {
    if (dbInstancePromise) {
        return dbInstancePromise;
    }

    const db = getFirestore(app);

    try {
      await enableIndexedDbPersistence(db);
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn("Firestore offline persistence failed: Multiple tabs open.");
      } else if (error.code === 'unimplemented') {
        console.warn("Firestore offline persistence not available in this browser.");
      }
    }

    await initializeDefaultData(db);
    dbInstancePromise = Promise.resolve(db);
    return dbInstancePromise;
}

export function getDb(): Promise<Firestore> {
    return initializeDb();
}

export { app };

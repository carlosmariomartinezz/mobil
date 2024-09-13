import {
    Account,
    Avatars,
    Client,
    Databases,
    ID,
    Query,
    Storage,
} from "react-native-appwrite";

// Configuración de Appwrite
export const appwriteConfig = {
    endpoint: "https://cloud.appwrite.io/v1",
    platform: "co.edu.sena.soy.plattea",
    projectId: "66e34e690029213c5f9d",
    databaseId: "66e3518b002f261f4923",
    userCollectionId: "66e351e2001332958d40",
    videoCollectionId: "66e3521b0009801951a5",
    storageId: "66e3563d00116767943c",
};

// Inicializa el cliente de Appwrite
const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint) // Configura el endpoint
    .setProject(appwriteConfig.projectId) // Configura el ID del proyecto
    .setPlatform(appwriteConfig.platform); // Configura la plataforma

const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const databases = new Databases(client);

// Función para esperar un tiempo específico
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para sanitizar el userId
function sanitizeUserId(userId) {
    if (!userId) return ''; // Retorna vacío si userId no está definido
    return userId
        .toLowerCase() // Convertir a minúsculas
        .replace(/[^a-z0-9.-]/g, '') // Eliminar caracteres no válidos
        .substring(0, 36); // Asegurarse de que no exceda los 36 caracteres
}

// Crear nuevo usuario
export async function createUser(email, password, username) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            username
        );

        if (!newAccount) throw new Error("Error al crear el usuario.");

        const avatarUrl = avatars.getInitials(username);

        await signIn(email, password); // Iniciar sesión tras crear el usuario

        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            {
                accountId: newAccount.$id,
                email: email,
                username: username,
                avatar: avatarUrl,
            }
        );

        return newUser;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Iniciar sesión con reintentos
export async function signIn(email, password) {
    const maxRetries = 3;
    const retryDelay = 2000; // Retraso en milisegundos (2 segundos)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const session = await account.createSession(email, password); // Usa createSession en lugar de createEmailSession
            return session;
        } catch (error) {
            if (error.message.includes("rate limit")) {
                console.warn(`Intento ${attempt + 1} fallido. Retrasando antes de reintentar...`);
                await delay(retryDelay);
            } else {
                throw new Error(error.message);
            }
        }
    }

    throw new Error("Se ha superado el número máximo de intentos.");
}

// Obtener cuenta actual
export async function getAccount() {
    try {
        const currentAccount = await account.get();
        return currentAccount;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Obtener usuario actual
export async function getCurrentUser() {
    try {
        const currentAccount = await getAccount();
        if (!currentAccount) throw new Error("Usuario no encontrado.");

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal("accountId", currentAccount.$id)]
        );

        if (!currentUser || currentUser.documents.length === 0) throw new Error("Usuario no encontrado.");

        return currentUser.documents[0];
    } catch (error) {
        console.log(error);
        return null;
    }
}

// Cerrar sesión
export async function signOut() {
    try {
        const session = await account.deleteSession("current");
        return session;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Subir archivo
export async function uploadFile(file, type) {
    if (!file) return;

    const { mimeType, ...rest } = file;
    const asset = { type: mimeType, ...rest };

    try {
        const uploadedFile = await storage.createFile(
            appwriteConfig.storageId,
            ID.unique(),
            asset
        );

        const fileUrl = await getFilePreview(uploadedFile.$id, type);
        return fileUrl;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Obtener vista previa de archivo
export async function getFilePreview(fileId, type) {
    let fileUrl;

    try {
        if (type === "video") {
            fileUrl = storage.getFileView(appwriteConfig.storageId, fileId);
        } else if (type === "image") {
            fileUrl = storage.getFilePreview(
                appwriteConfig.storageId,
                fileId,
                2000,
                2000,
                "top",
                100
            );
        } else {
            throw new Error("Tipo de archivo no válido");
        }

        if (!fileUrl) throw new Error("Error al obtener la vista previa.");

        return fileUrl;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Crear publicación de video
export async function createVideoPost(form) {
    try {
        // Sanitiza el userId
        const sanitizedUserId = sanitizeUserId(form.creator);

        const [thumbnailUrl, videoUrl] = await Promise.all([
            uploadFile(form.thumbnail, "image"),
            uploadFile(form.video, "video"),
        ]);

        const newPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.videoCollectionId,
            ID.unique(),
            {
                title: form.title,
                thumbnail: thumbnailUrl,
                video: videoUrl,
                prompt: form.prompt,
                creator: sanitizedUserId, // Usa el userId sanitizado
            }
        );

        return newPost;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Obtener todas las publicaciones de video
export async function getAllPosts() {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.videoCollectionId
        );

        return posts.documents;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Obtener publicaciones de un usuario
export async function getUserPosts(userId) {
    try {
        // Sanitiza el userId
        const sanitizedUserId = sanitizeUserId(userId);

        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.videoCollectionId,
            [Query.equal("creator", sanitizedUserId)] // Usa el userId sanitizado
        );

        return posts.documents;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Buscar publicaciones por título
export async function searchPosts(query) {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.videoCollectionId,
            [Query.search("title", query)]
        );

        if (!posts) throw new Error("Algo salió mal.");

        return posts.documents;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Obtener últimas publicaciones
export async function getLatestPosts() {
    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.videoCollectionId,
            [Query.orderDesc("$createdAt"), Query.limit(7)]
        );

        return posts.documents;
    } catch (error) {
        throw new Error(error.message);
    }
}

import { API_URL } from '../../../config';
import React, { useState } from 'react';
import './PrototypeUpload.css';

const PrototypeUpload = ({ equipoId = 1, onImageUploaded }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [descripcion, setDescripcion] = useState('');

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('El archivo es demasiado grande. Máximo 5MB permitido.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setPreviewUrl(previewUrl);
        setSelectedFile(file);
    };

    const uploadToGoogleCloud = async (file) => {
        try {
            const extension = file.name.split('.').pop().toLowerCase();
            const signedUrlResponse = await fetch(
                `${API_URL}/signed-url/?grupoId=${equipoId}&ext=${extension}`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!signedUrlResponse.ok) {
                throw new Error('Error al obtener URL firmada');
            }

            const { uploadUrl, publicUrl } = await signedUrlResponse.json();
            setUploadProgress(33);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type
                },
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error('Error al subir la imagen a Google Cloud');
            }

            setUploadProgress(66);

            const saveResponse = await fetch(`${API_URL}/guardar-imagen/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    equipo_id: equipoId,
                    image_url: publicUrl,
                    descripcion: descripcion
                })
            });

            if (!saveResponse.ok) {
                throw new Error('Error al guardar la imagen en la base de datos');
            }

            const saveResult = await saveResponse.json();
            setUploadProgress(100);

            return {
                imageUrl: publicUrl,
                solucionId: saveResult.solucion_id,
                created: saveResult.created
            };

        } catch (error) {
            console.error('Error en uploadToGoogleCloud:', error);
            throw error;
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('Por favor selecciona un archivo primero');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const result = await uploadToGoogleCloud(selectedFile);
            
            alert('¡Imagen subida y guardada exitosamente!');
            
            if (onImageUploaded) {
                onImageUploaded(result);
            }

            setSelectedFile(null);
            setPreviewUrl(null);
            setDescripcion('');
            
        } catch (error) {
            console.error('Error al subir imagen:', error);
            alert(`Error al subir la imagen: ${error.message}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="prototype-upload">
            <h3>Subir Foto del Prototipo LEGO</h3>
            
            <div className="upload-section">
                <div className="file-input-container">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        id="file-input"
                        className="file-input"
                    />
                    <label htmlFor="file-input" className="file-input-label">
                        {selectedFile ? selectedFile.name : 'Seleccionar imagen'}
                    </label>
                </div>

                {previewUrl && (
                    <div className="preview-container">
                        <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="preview-image"
                        />
                    </div>
                )}

                <div className="description-container">
                    <label htmlFor="descripcion">Descripción de la solución:</label>
                    <textarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Describe tu prototipo LEGO..."
                        disabled={uploading}
                        className="description-textarea"
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="upload-button"
                >
                    {uploading ? 'Subiendo...' : 'Subir Imagen'}
                </button>

                {uploading && (
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="progress-text">
                            Progreso: {uploadProgress}%
                        </p>
                    </div>
                )}
            </div>

            <div className="info-section">
                <p><strong>Equipo ID:</strong> {equipoId}</p>
                <p><small>Formatos soportados: PNG, JPG, JPEG (máx. 5MB)</small></p>
            </div>
        </div>
    );
};

export default PrototypeUpload;
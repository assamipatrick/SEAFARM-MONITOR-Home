
import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Input from '../components/ui/Input';
import { PERMISSIONS } from '../permissions';
import Authorization from '../components/auth/Authorization';
import type { GalleryPhoto } from '../types';

const PhotoGallery: React.FC = () => {
    const { t, language } = useLocalization();
    const { galleryPhotos, addGalleryPhoto, updateGalleryPhotoComment, deleteGalleryPhoto } = useData();
    const { currentUser } = useAuth();
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filtering logic
    const filteredPhotos = useMemo(() => {
        return galleryPhotos.filter(photo => {
            const commentMatch = photo.comment.toLowerCase().includes(searchTerm.toLowerCase());
            const dateMatch = photo.date.includes(searchTerm);
            return commentMatch || dateMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first
    }, [galleryPhotos, searchTerm]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && currentUser) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhoto = {
                    date: new Date().toISOString(),
                    url: reader.result as string,
                    comment: '',
                    uploadedBy: currentUser.id
                };
                addGalleryPhoto(newPhoto);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDeleteClick = (id: string) => {
        setPhotoToDelete(id);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (photoToDelete) {
            deleteGalleryPhoto(photoToDelete);
            setIsConfirmOpen(false);
            setPhotoToDelete(null);
        }
    };

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Icon name="Image" className="w-8 h-8 text-blue-600" />
                    {t('photoGallery')}
                </h1>
                
                <Authorization permission={PERMISSIONS.GALLERY_MANAGE}>
                    <div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <Button onClick={() => fileInputRef.current?.click()}>
                            <Icon name="PlusCircle" className="w-5 h-5 mr-2"/>
                            {t('addPhoto')}
                        </Button>
                    </div>
                </Authorization>
            </div>

            <Card className="mb-6">
                <Input 
                    placeholder={t('search')} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    containerClassName="max-w-md"
                />
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPhotos.map(photo => (
                    <PhotoCard 
                        key={photo.id} 
                        photo={photo} 
                        onDelete={handleDeleteClick}
                        onUpdateComment={updateGalleryPhotoComment}
                        language={language}
                        t={t}
                    />
                ))}
            </div>

            {filteredPhotos.length === 0 && (
                <div className="text-center p-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                    <Icon name="Image" className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>{t('noPhotos')}</p>
                </div>
            )}

            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('confirmDeleteTitle')}
                    message={t('confirmDeletePhoto')}
                />
            )}
        </div>
    );
};

const PhotoCard: React.FC<{
    photo: GalleryPhoto;
    onDelete: (id: string) => void;
    onUpdateComment: (id: string, comment: string) => void;
    language: string;
    t: (key: string) => string;
}> = ({ photo, onDelete, onUpdateComment, language, t }) => {
    const [comment, setComment] = useState(photo.comment);
    const [isEditing, setIsEditing] = useState(false);

    const handleBlur = () => {
        setIsEditing(false);
        if (comment !== photo.comment) {
            onUpdateComment(photo.id, comment);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col transition-all hover:shadow-xl group">
            <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-pointer">
                <img 
                    src={photo.url} 
                    alt="Gallery item" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                        variant="secondary" 
                        onClick={() => window.open(photo.url, '_blank')}
                        className="!rounded-full p-2 bg-white/90 hover:bg-white text-gray-900"
                    >
                        <Icon name="Eye" className="w-5 h-5" />
                    </Button>
                </div>
                <Authorization permission={PERMISSIONS.GALLERY_MANAGE}>
                    <button 
                        onClick={() => onDelete(photo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-700"
                    >
                        <Icon name="Trash2" className="w-4 h-4" />
                    </button>
                </Authorization>
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {new Date(photo.date).toLocaleString(language, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                </div>
                
                <div className="flex-grow">
                    <label className="sr-only">{t('notes')}</label>
                    <textarea
                        className={`w-full text-sm bg-transparent border-0 border-b-2 p-1 resize-none focus:ring-0 transition-colors ${
                            isEditing 
                                ? 'border-blue-500 dark:border-blue-400 bg-gray-50 dark:bg-gray-900' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        } text-gray-800 dark:text-gray-200 placeholder-gray-400`}
                        rows={2}
                        placeholder={t('photoCommentPlaceholder')}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onFocus={() => setIsEditing(true)}
                        onBlur={handleBlur}
                        readOnly={!isEditing} 
                    />
                </div>
            </div>
        </div>
    );
};

export default PhotoGallery;

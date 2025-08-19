import React, { useState, useEffect } from 'react';
import { fetchAndCacheImage } from '../lib/imageStore';
import { MenuItem } from '../types';

interface MenuCardImageProps {
    item: MenuItem;
}

// A generic placeholder image in case of errors or empty URLs
const placeholderImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop';

const MenuCardImage: React.FC<MenuCardImageProps> = ({ item }) => {
    const [imageSrc, setImageSrc] = useState<string>(''); // Start empty to show a loading state

    useEffect(() => {
        let isMounted = true;
        
        const loadImage = async () => {
            if (!item.image) {
                if (isMounted) setImageSrc(placeholderImage);
                return;
            }

            const imageBlob = await fetchAndCacheImage(item.id, item.image);

            if (isMounted) {
                if (imageBlob) {
                    setImageSrc(URL.createObjectURL(imageBlob));
                } else {
                    setImageSrc(placeholderImage); // Fallback on any error
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
            // Revoke the object URL to prevent memory leaks when the component unmounts
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [item.id, item.image]); // Rerun effect if item ID or image URL changes

    // Show a simple loading indicator while the image is being fetched/retrieved
    if (!imageSrc) {
        return <div style={{ 
            width: '100%', 
            height: '7.5rem', 
            backgroundColor: 'var(--background-color)',
            animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }} />;
    }

    return (
        <img 
            src={imageSrc} 
            alt={item.name}
            // No more onError or loading="lazy" needed here; our component handles it all.
        />
    );
};

export default MenuCardImage;
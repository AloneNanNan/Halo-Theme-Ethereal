// 图片灯箱 & 相册图库
type Destroyable = { destroy?: () => void };

let lightbox: Destroyable | undefined;
let isLoadingContentPhotoSwipe = false;
let photosGalleryLightbox: Destroyable | undefined;
let isLoadingPhotosGalleryLightbox = false;

async function initContentLightbox() {
  if (lightbox || isLoadingContentPhotoSwipe) return;
  isLoadingContentPhotoSwipe = true;
  try {
    await import("photoswipe/style.css");
    const { initContentPhotoSwipe } =
      await import("../utils/content-photoswipe");
    lightbox = initContentPhotoSwipe();
  } catch (error) {
    console.error("[Ethereal] Failed to initialize content images", error);
  } finally {
    isLoadingContentPhotoSwipe = false;
  }
}

async function initPhotosGallery() {
  if (photosGalleryLightbox || isLoadingPhotosGalleryLightbox) return;
  if (!document.getElementById("photos-gallery")) return;
  isLoadingPhotosGalleryLightbox = true;
  try {
    await import("photoswipe/style.css");
    const { initPhotosGalleryLightbox } =
      await import("../utils/photos-gallery-lightbox");
    photosGalleryLightbox = initPhotosGalleryLightbox();
  } catch (error) {
    console.error("[Ethereal] Failed to initialize photos gallery", error);
  } finally {
    isLoadingPhotosGalleryLightbox = false;
  }
}

function destroyAll() {
  lightbox?.destroy?.();
  lightbox = undefined;
  photosGalleryLightbox?.destroy?.();
  photosGalleryLightbox = undefined;
}

export { initContentLightbox, initPhotosGallery, destroyAll };

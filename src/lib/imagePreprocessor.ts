export async function preprocessHandwritingImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas not supported in this browser."));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const scale = Math.max(1, 2000 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index] ?? 0;
          const green = data[index + 1] ?? 0;
          const blue = data[index + 2] ?? 0;

          const gray = 0.299 * red + 0.587 * green + 0.114 * blue;

          const contrast = 1.5;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          const contrasted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

          const sharpened = contrasted < 128
            ? Math.max(0, contrasted - 30)
            : Math.min(255, contrasted + 30);

          data[index] = sharpened;
          data[index + 1] = sharpened;
          data[index + 2] = sharpened;
        }

        ctx.putImageData(imageData, 0, 0);

        const base64 = canvas.toDataURL("image/jpeg", 1.0).split(",")[1] ?? "";
        URL.revokeObjectURL(url);

        if (!base64) {
          reject(new Error("Failed to preprocess image."));
          return;
        }

        resolve({ base64, mimeType: "image/jpeg" });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error instanceof Error ? error : new Error("Failed to preprocess image."));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load selected image."));
    };

    img.src = url;
  });
}

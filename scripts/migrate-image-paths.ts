import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting image path migration from /uploads/ to /api/files/...");

  // 1. Update Salon images
  // Real check for array items
  const allSalons = await prisma.salon.findMany();
  for (const salon of allSalons) {
    let updated = false;
    const newImages = (salon.images || []).map(img => {
      if (typeof img === 'string' && img.startsWith("/uploads/")) {
        updated = true;
        return img.replace("/uploads/", "/api/files/");
      }
      return img;
    });

    let newProfileImage = salon.profileImage;
    if (salon.profileImage?.startsWith("/uploads/")) {
      newProfileImage = salon.profileImage.replace("/uploads/", "/api/files/");
      updated = true;
    }

    let newCoverImage = salon.coverImage;
    if (salon.coverImage?.startsWith("/uploads/")) {
      newCoverImage = salon.coverImage.replace("/uploads/", "/api/files/");
      updated = true;
    }

    if (updated) {
      await prisma.salon.update({
        where: { id: salon.id },
        data: {
          images: newImages,
          profileImage: newProfileImage,
          coverImage: newCoverImage
        }
      });
      console.log(`Updated Salon: ${salon.name}`);
    }
  }

  // 2. Update Post images
  const allPosts = await prisma.post.findMany();
  for (const post of allPosts) {
    let updated = false;
    const newImages = (post.images || []).map(img => {
      if (typeof img === 'string' && img.startsWith("/uploads/")) {
        updated = true;
        return img.replace("/uploads/", "/api/files/");
      }
      return img;
    });

    if (updated) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          images: newImages
        }
      });
      console.log(`Updated Post ID: ${post.id}`);
    }
  }

  console.log("Migration finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

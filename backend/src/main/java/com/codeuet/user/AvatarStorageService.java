package com.codeuet.user;

import com.codeuet.common.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores only small, recognized image uploads under a server-controlled directory.
 * A new unguessable filename is used for every update; original filenames are ignored.
 */
@Service
public class AvatarStorageService {
    public static final long MAX_BYTES = 2L * 1024 * 1024;
    private static final Pattern SAFE_FILENAME = Pattern.compile("[0-9a-f]{32}\\.(jpg|png|webp)");
    private final Path directory;

    public record AvatarFile(byte[] bytes, String contentType) {
    }

    public AvatarStorageService(@Value("${app.avatar-dir:./uploads/avatars}") String location) {
        this.directory = Path.of(location).toAbsolutePath().normalize();
    }

    public String save(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.bad("Vui lòng chọn ảnh đại diện");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.bad("Ảnh đại diện không được vượt quá 2 MB");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length == 0 || bytes.length > MAX_BYTES) {
                throw ApiException.bad("Ảnh đại diện không được vượt quá 2 MB");
            }
            String extension = imageExtension(bytes);
            if (extension == null) {
                throw ApiException.bad("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ");
            }
            Files.createDirectories(directory);
            String name = UUID.randomUUID().toString().replace("-", "") + "." + extension;
            Files.write(directory.resolve(name), bytes, StandardOpenOption.CREATE_NEW);
            return "/api/v1/users/avatars/" + name;
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "AVATAR_STORAGE_ERROR", "Không thể lưu ảnh đại diện");
        }
    }

    public AvatarFile load(String name) {
        if (name == null || !SAFE_FILENAME.matcher(name).matches()) {
            throw ApiException.notFound();
        }
        Path path = directory.resolve(name).normalize();
        if (!path.startsWith(directory) || !Files.isRegularFile(path)) {
            throw ApiException.notFound();
        }
        try {
            byte[] bytes = Files.readAllBytes(path);
            if (bytes.length == 0 || bytes.length > MAX_BYTES || imageExtension(bytes) == null) {
                throw ApiException.notFound();
            }
            String contentType = name.endsWith(".png") ? "image/png"
                    : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
            return new AvatarFile(bytes, contentType);
        } catch (IOException e) {
            throw ApiException.notFound();
        }
    }

    public void deletePrevious(String url) {
        if (url == null || !url.startsWith("/api/v1/users/avatars/")) return;
        String filename = url.substring("/api/v1/users/avatars/".length());
        if (!SAFE_FILENAME.matcher(filename).matches()) return;
        try {
            Files.deleteIfExists(directory.resolve(filename));
        } catch (IOException ignored) {
            // The user's new avatar was already saved; file cleanup is best-effort.
        }
    }

    private static String imageExtension(byte[] b) {
        // PNG: 8-byte signature and a valid IHDR marker.
        if (b.length >= 24 && (b[0] & 0xff) == 0x89 && b[1] == 0x50 && b[2] == 0x4e
                && b[3] == 0x47 && b[4] == 0x0d && b[5] == 0x0a && b[6] == 0x1a
                && b[7] == 0x0a && b[12] == 'I' && b[13] == 'H' && b[14] == 'D' && b[15] == 'R') {
            return "png";
        }
        // JPEG SOI and end marker; avoid trusting user supplied Content-Type.
        if (b.length >= 4 && (b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8
                && (b[b.length - 2] & 0xff) == 0xff && (b[b.length - 1] & 0xff) == 0xd9) {
            return "jpg";
        }
        // WebP RIFF header, WEBP marker and recognized VP8 chunk type.
        if (b.length >= 16 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P'
                && b[12] == 'V' && b[13] == 'P' && b[14] == '8'
                && (b[15] == ' ' || b[15] == 'L' || b[15] == 'X')) {
            return "webp";
        }
        return null;
    }
}

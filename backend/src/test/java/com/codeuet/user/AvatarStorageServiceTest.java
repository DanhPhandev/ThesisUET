package com.codeuet.user;

import com.codeuet.common.ApiException;
import java.nio.file.Path;
import java.nio.file.Files;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;

class AvatarStorageServiceTest {
    @TempDir Path temp;

    // A minimal payload with the fixed PNG signature and IHDR marker.
    private byte[] pngBytes() {
        byte[] data = new byte[24];
        byte[] signature = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
        System.arraycopy(signature, 0, data, 0, signature.length);
        data[12] = 'I'; data[13] = 'H'; data[14] = 'D'; data[15] = 'R';
        return data;
    }

    @Test
    void storesImageWithGeneratedNameAndServesIt() {
        var store = new AvatarStorageService(temp.toString());
        var file = new MockMultipartFile("file", "../../evil.svg", "image/png", pngBytes());
        String url = store.save(file);
        assertTrue(url.matches("/api/v1/users/avatars/[0-9a-f]{32}\\.png"));
        String name = url.substring(url.lastIndexOf('/') + 1);
        assertTrue(Files.isRegularFile(temp.resolve(name)));
        assertArrayEquals(pngBytes(), store.load(name).bytes());
        assertEquals("image/png", store.load(name).contentType());
        store.deletePrevious(url);
        assertFalse(Files.exists(temp.resolve(name)));
    }

    @Test
    void rejectsUnsupportedFilesAndTraversal() {
        var store = new AvatarStorageService(temp.toString());
        assertThrows(ApiException.class, () -> store.save(
                new MockMultipartFile("file", "x.svg", "image/png", "<svg/>".getBytes())));
        assertThrows(ApiException.class, () -> store.load("../secrets"));
        assertThrows(ApiException.class, () -> store.load("other.png"));
    }

    @Test
    void rejectsOversizedImages() {
        var store = new AvatarStorageService(temp.toString());
        byte[] data = new byte[(int) AvatarStorageService.MAX_BYTES + 1];
        assertThrows(ApiException.class, () -> store.save(
                new MockMultipartFile("file", "large.png", "image/png", data)));
    }
}

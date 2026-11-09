package ch.duartesantos.opengym;

import static org.junit.Assert.*;

import java.io.File;
import java.nio.file.Files;
import org.junit.Test;

/** How the downloaded exercise pictures are served (hevier/DECISIONS.md D115). */
public class HevierMediaPluginTest {
    @Test
    public void aClosedRange() {
        assertArrayEquals(new long[] { 0, 99 }, HevierMediaPlugin.parseRange("bytes=0-99", 1000));
        assertArrayEquals(new long[] { 500, 999 }, HevierMediaPlugin.parseRange(" bytes=500-999 ", 1000));
    }

    @Test
    public void anOpenRangeRunsToTheEnd() {
        assertArrayEquals(new long[] { 0, 999 }, HevierMediaPlugin.parseRange("bytes=0-", 1000));
        assertArrayEquals(new long[] { 640, 999 }, HevierMediaPlugin.parseRange("bytes=640-", 1000));
    }

    @Test
    public void anEndPastTheFileIsClamped() {
        assertArrayEquals(new long[] { 10, 999 }, HevierMediaPlugin.parseRange("bytes=10-5000", 1000));
    }

    @Test
    public void aStartPastTheFileIsUnsatisfiable() {
        assertSame(HevierMediaPlugin.UNSATISFIABLE, HevierMediaPlugin.parseRange("bytes=1000-", 1000));
        assertSame(HevierMediaPlugin.UNSATISFIABLE, HevierMediaPlugin.parseRange("bytes=2000-3000", 1000));
    }

    @Test
    public void anythingElseSendsTheWholeFile() {
        assertNull(HevierMediaPlugin.parseRange(null, 1000));
        assertNull(HevierMediaPlugin.parseRange("", 1000));
        assertNull(HevierMediaPlugin.parseRange("bytes=-500", 1000));
        assertNull(HevierMediaPlugin.parseRange("bytes=0-10,20-30", 1000));
        assertNull(HevierMediaPlugin.parseRange("bytes=50-10", 1000));
        assertNull(HevierMediaPlugin.parseRange("items=0-10", 1000));
        assertNull(HevierMediaPlugin.parseRange("bytes=a-b", 1000));
        assertNull(HevierMediaPlugin.parseRange("bytes=99999999999999999999-", 1000));
    }

    @Test
    public void theMimeByExtension() {
        assertEquals("image/webp", HevierMediaPlugin.mimeOf("0001.webp"));
        assertEquals("image/webp", HevierMediaPlugin.mimeOf("0001.WEBP"));
        assertEquals("video/mp4", HevierMediaPlugin.mimeOf("0001.mp4"));
        assertEquals("text/markdown", HevierMediaPlugin.mimeOf("NOTICE.md"));
        assertEquals("application/octet-stream", HevierMediaPlugin.mimeOf("index.json"));
        assertEquals("application/octet-stream", HevierMediaPlugin.mimeOf("noext"));
    }

    @Test
    public void aFileInsideTheFolder() throws Exception {
        File root = Files.createTempDirectory("media").toFile();
        try {
            File f = HevierMediaPlugin.inside(root, "still/0001.webp");
            assertNotNull(f);
            assertEquals(new File(root.getCanonicalFile(), "still/0001.webp"), f);
            assertNotNull(HevierMediaPlugin.inside(root, "still/../NOTICE.md"));
        } finally {
            root.delete();
        }
    }

    @Test
    public void aPathOutOfTheFolderIsRefused() throws Exception {
        File root = Files.createTempDirectory("media").toFile();
        try {
            assertNull(HevierMediaPlugin.inside(root, "../secret"));
            assertNull(HevierMediaPlugin.inside(root, "still/../../secret"));
            assertNull(HevierMediaPlugin.inside(root, "../" + root.getName() + "x/a.webp"));
            assertNull(HevierMediaPlugin.inside(root, ""));
            assertNull(HevierMediaPlugin.inside(root, "."));
            assertNull(HevierMediaPlugin.inside(root, null));
        } finally {
            root.delete();
        }
    }
}

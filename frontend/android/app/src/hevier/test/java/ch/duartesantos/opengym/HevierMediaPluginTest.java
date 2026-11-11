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

    // ── the swap and what a killed run leaves (D115) ────────────────────────────────────────────

    private static File dirWith(File base, String name, String content) throws Exception {
        File d = new File(base, name);
        d.mkdirs();
        Files.write(new File(d, "still.webp").toPath(), content.getBytes("UTF-8"));
        return d;
    }

    private static String read(File base, String name) throws Exception {
        return new String(Files.readAllBytes(new File(new File(base, name), "still.webp").toPath()), "UTF-8");
    }

    @Test
    public void aSwapPutsTheNewCopyInPlaceAndLeavesNothingElse() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        dirWith(base, "exercise-media", "old");
        File fresh = dirWith(base, "exercise-media.new", "new");
        HevierMediaPlugin.swapIn(base, fresh);
        assertEquals("new", read(base, "exercise-media"));
        assertFalse(new File(base, "exercise-media.old").exists());
        assertFalse(fresh.exists());
    }

    @Test
    public void aFirstSwapNeedsNoCurrentCopy() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        HevierMediaPlugin.swapIn(base, dirWith(base, "exercise-media.new", "new"));
        assertEquals("new", read(base, "exercise-media"));
    }

    @Test
    public void aFailedSwapKeepsTheCurrentCopy() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        dirWith(base, "exercise-media", "old");
        try {
            HevierMediaPlugin.swapIn(base, new File(base, "missing.new"));
            fail("a swap from nothing must fail");
        } catch (java.io.IOException expected) {
            // the old copy is back where it was
        }
        assertEquals("old", read(base, "exercise-media"));
        assertFalse(new File(base, "exercise-media.old").exists());
    }

    @Test
    public void killedBetweenTheRenamesTheOldCopyComesBack() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        dirWith(base, "exercise-media.old", "old");
        dirWith(base, "exercise-media.new", "half");
        HevierMediaPlugin.recover(base);
        assertEquals("old", read(base, "exercise-media"));
        assertFalse(new File(base, "exercise-media.old").exists());
        assertFalse(new File(base, "exercise-media.new").exists());
    }

    @Test
    public void killedAfterTheSwapTheNewCopyStays() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        dirWith(base, "exercise-media", "new");
        dirWith(base, "exercise-media.old", "old");
        HevierMediaPlugin.recover(base);
        assertEquals("new", read(base, "exercise-media"));
        assertFalse(new File(base, "exercise-media.old").exists());
    }

    @Test
    public void theFullApkDropsEveryDownloadedCopy() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        dirWith(base, "exercise-media", "a");
        dirWith(base, "exercise-media.old", "b");
        dirWith(base, "exercise-media.new", "c");
        dirWith(base, "other", "keep");
        HevierMediaPlugin.dropAll(base);
        assertArrayEquals(new String[] { "other" }, base.list());
    }

    // ── the plain reads and the delete that never follows a link ────────────────────────────────

    @Test
    public void readAllReadsTheWholeFile() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        byte[] big = new byte[20_000];
        for (int i = 0; i < big.length; i++) big[i] = (byte) i;
        File f = new File(base, "big.bin");
        Files.write(f.toPath(), big);
        assertArrayEquals(big, HevierMediaPlugin.readAll(f));
        File empty = new File(base, "empty");
        Files.write(empty.toPath(), new byte[0]);
        assertEquals(0, HevierMediaPlugin.readAll(empty).length);
        dirWith(base, "exercise-media", "1.2.3");
        assertEquals("1.2.3", new String(HevierMediaPlugin.readAll(new File(new File(base, "exercise-media"), "still.webp")), "UTF-8"));
    }

    @Test(expected = java.io.IOException.class)
    public void readAllOfAMissingFileFails() throws Exception {
        HevierMediaPlugin.readAll(new File(Files.createTempDirectory("media").toFile(), "missing"));
    }

    @Test
    public void aLinkIsToldFromAFolder() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        File real = dirWith(base, "real", "x");
        File link = new File(base, "link");
        Files.createSymbolicLink(link.toPath(), real.toPath());
        assertTrue(HevierMediaPlugin.isLink(link));
        assertFalse(HevierMediaPlugin.isLink(real));
        assertFalse(HevierMediaPlugin.isLink(new File(real, "still.webp")));
        // reached through a linked folder, the file itself is still no link
        assertFalse(HevierMediaPlugin.isLink(new File(link, "still.webp")));
    }

    @Test
    public void aDeleteRemovesTheLinkNotWhatItPointsTo() throws Exception {
        File base = Files.createTempDirectory("media").toFile();
        File outside = Files.createTempDirectory("outside").toFile();
        dirWith(outside, "keep", "mine");
        File media = dirWith(base, "exercise-media", "a");
        Files.createSymbolicLink(new File(media, "out").toPath(), outside.toPath());
        HevierMediaPlugin.deleteTree(media);
        assertFalse(media.exists());
        assertEquals("mine", read(outside, "keep"));
    }
}

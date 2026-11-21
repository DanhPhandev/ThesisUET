package com.codeuet.submission;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class Judge0ClientTest {
 @Test void mapsVerdicts(){assertEquals("AC",Judge0Client.verdict(Map.of("status",Map.of("id",3)),256));assertEquals("WA",Judge0Client.verdict(Map.of("status",Map.of("id",4)),256));assertEquals("TLE",Judge0Client.verdict(Map.of("status",Map.of("id",5)),256));assertEquals("CE",Judge0Client.verdict(Map.of("status",Map.of("id",6)),256));assertEquals("RE",Judge0Client.verdict(Map.of("status",Map.of("id",11),"memory",1000),256));assertEquals("MLE",Judge0Client.verdict(Map.of("status",Map.of("id",11),"memory",256*1024),256));}
}

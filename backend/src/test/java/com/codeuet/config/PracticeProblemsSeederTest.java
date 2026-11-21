package com.codeuet.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class PracticeProblemsSeederTest {
    @Test
    void executesSinglePostgresBlockContainingTenUniqueProblems() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        new PracticeProblemsSeeder(jdbc, true).run();

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(1)).execute(captor.capture());
        String sql = captor.getValue();
        assertThat(sql).contains("DO $codeuet_practice_seed$")
                .contains("ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id")
                .contains("'uet-dem-so-chan'")
                .contains("'uet-balo-01'")
                .contains("END;\n$codeuet_practice_seed$;");
        assertThat(sql.split("INSERT INTO test_cases\\(", -1).length - 1).isEqualTo(10);
    }

    @Test
    void skipsWhenDisabled() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        new PracticeProblemsSeeder(jdbc, false).run();
        verifyNoInteractions(jdbc);
    }
}

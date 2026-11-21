package com.codeuet.config;

import com.codeuet.common.Db;
import com.codeuet.auth.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class BootstrapData {
    @Bean
    @Order(1)
    CommandLineRunner seed(Db db, AuthService auth, @Value("${app.admin-email:}") String adminEmail,
            @Value("${app.admin-password:}") String adminPassword) {
        return args -> {
            if (adminEmail.isBlank() || adminPassword.isBlank())
                return;
            var admin = db.maybe("SELECT * FROM users WHERE email=:email", db.m("email", adminEmail));
            long id;
            if (admin == null) {
                id = db.insert(
                        "INSERT INTO users(username,email,password_hash,full_name,role) VALUES ('admin',:email,:pass,'Quản trị viên','ADMIN') RETURNING id",
                        db.m("email", adminEmail, "pass", auth.encode(adminPassword)));
            } else {
                id = ((Number) admin.get("id")).longValue();
            }
            var count = db.one("SELECT COUNT(*) AS n FROM problems", db.m());
            if (((Number) count.get("n")).longValue() == 0) {
                long p = db.insert(
                        "INSERT INTO problems(slug,title,statement,input_format,output_format,constraints_text,difficulty,visibility,author_id) VALUES ('tong-hai-so','Tổng hai số','Cho hai số nguyên a và b. Hãy in ra tổng a + b.','Một dòng gồm hai số nguyên a và b.','In ra a + b.','-10^9 <= a, b <= 10^9','EASY','PUBLIC',:author) RETURNING id",
                        db.m("author", id));
                db.exec("INSERT INTO test_cases(problem_id,input,expected_output,is_sample,order_index) VALUES (:p,'2 3','5',TRUE,1),(:p,'-4 9','5',FALSE,2),(:p,'100 200','300',FALSE,3)",
                        db.m("p", p));
                db.exec("INSERT INTO problem_tags(problem_id,tag_id) SELECT :p,id FROM tags WHERE slug='math'",
                        db.m("p", p));
                long p2 = db.insert(
                        "INSERT INTO problems(slug,title,statement,input_format,output_format,constraints_text,difficulty,visibility,author_id) VALUES ('so-lon-nhat','Số lớn nhất','Nhập ba số nguyên, in ra số lớn nhất.','Ba số nguyên a, b, c.','Số nguyên lớn nhất.','Các số trong khoảng -10^6 đến 10^6','EASY','PUBLIC',:author) RETURNING id",
                        db.m("author", id));
                db.exec("INSERT INTO test_cases(problem_id,input,expected_output,is_sample,order_index) VALUES (:p,'1 5 3','5',TRUE,1),(:p,'-1 -3 -2','-1',FALSE,2)",
                        db.m("p", p2));
            }
        };
    }
}

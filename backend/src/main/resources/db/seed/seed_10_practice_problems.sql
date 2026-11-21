-- CodeUET: 10 bài luyện tập (3 EASY, 5 MEDIUM, 2 HARD), tổng 80 test cases.
-- Có thể chạy trong DBeaver (Execute SQL Script) sau khi database đã có tài khoản.
-- Được backend tự chạy sau bước tạo tài khoản admin. Idempotent: không sửa bài đã tồn tại.
-- Khác Flyway migration: tài khoản tác giả có thể chỉ được tạo sau khi Flyway đã chạy.
DO $codeuet_practice_seed$
DECLARE
    v_author_id BIGINT;
    v_problem_id BIGINT;
BEGIN
    SELECT id INTO v_author_id
    FROM users
    WHERE status = 'ACTIVE' AND role IN ('ADMIN', 'SETTER')
    ORDER BY CASE role WHEN 'ADMIN' THEN 0 WHEN 'SETTER' THEN 1 ELSE 2 END, id
    LIMIT 1;
    IF v_author_id IS NULL THEN
        RAISE NOTICE 'CodeUET: chưa có ADMIN/SETTER đang hoạt động; bỏ qua seed. Tạo admin/setter và chạy lại.';
        RETURN;
    END IF;

    INSERT INTO tags(name, slug)
    VALUES ('Tổng tiền tố','prefix-sum'),('Ngăn xếp','stack'),('Cây phân đoạn','segment-tree')
    ON CONFLICT DO NOTHING;

    -- Đếm số chẵn trong mảng | EASY | array
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-dem-so-chan', 'Đếm số chẵn trong mảng', 'Cho mảng gồm `n` số nguyên. Hãy đếm số phần tử **chia hết cho 2**. Số `0` cũng được coi là số chẵn. In ra đúng một số nguyên là số lượng phần tử chẵn.', 'Dòng 1 chứa n. Dòng 2 chứa n số nguyên a[i] cách nhau bởi dấu cách.', 'In một số nguyên: số phần tử chẵn.', '1 ≤ n ≤ 200000; -10^9 ≤ a[i] ≤ 10^9.', 'EASY', 1000, 128, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'array'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '6
1 2 3 4 5 6
', '3
', TRUE, 1, 1),
            (v_problem_id, '5
-4 -3 -2 -1 0
', '3
', TRUE, 1, 2),
            (v_problem_id, '1
1
', '0
', FALSE, 1, 3),
            (v_problem_id, '1
0
', '1
', FALSE, 1, 4),
            (v_problem_id, '73
2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2
', '73
', FALSE, 1, 5),
            (v_problem_id, '57
1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
', '0
', FALSE, 1, 6),
            (v_problem_id, '9
-2 1 4 -7 10 -11 0 999999999 -1000000000
', '5
', FALSE, 1, 7),
            (v_problem_id, '1000
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 342 343 344 345 346 347 348 349 350 351 352 353 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 419 420 421 422 423 424 425 426 427 428 429 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 463 464 465 466 467 468 469 470 471 472 473 474 475 476 477 478 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 517 518 519 520 521 522 523 524 525 526 527 528 529 530 531 532 533 534 535 536 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 552 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 568 569 570 571 572 573 574 575 576 577 578 579 580 581 582 583 584 585 586 587 588 589 590 591 592 593 594 595 596 597 598 599 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 621 622 623 624 625 626 627 628 629 630 631 632 633 634 635 636 637 638 639 640 641 642 643 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 659 660 661 662 663 664 665 666 667 668 669 670 671 672 673 674 675 676 677 678 679 680 681 682 683 684 685 686 687 688 689 690 691 692 693 694 695 696 697 698 699 700 701 702 703 704 705 706 707 708 709 710 711 712 713 714 715 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 732 733 734 735 736 737 738 739 740 741 742 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 771 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 817 818 819 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 838 839 840 841 842 843 844 845 846 847 848 849 850 851 852 853 854 855 856 857 858 859 860 861 862 863 864 865 866 867 868 869 870 871 872 873 874 875 876 877 878 879 880 881 882 883 884 885 886 887 888 889 890 891 892 893 894 895 896 897 898 899 900 901 902 903 904 905 906 907 908 909 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 929 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 962 963 964 965 966 967 968 969 970 971 972 973 974 975 976 977 978 979 980 981 982 983 984 985 986 987 988 989 990 991 992 993 994 995 996 997 998 999 1000
', '500
', FALSE, 1, 8);
    END IF;

    -- Kiểm tra chuỗi đối xứng | EASY | string
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-chuoi-doi-xung', 'Kiểm tra chuỗi đối xứng', 'Một chuỗi được gọi là **đối xứng (palindrome)** nếu đọc từ trái sang phải hay phải sang trái đều như nhau. Hãy kiểm tra chuỗi `s`. Phân biệt chữ hoa và chữ thường (đầu vào chỉ chứa chữ thường).', 'Một dòng chứa chuỗi s, không chứa khoảng trắng.', 'In YES nếu s là chuỗi đối xứng, ngược lại in NO.', '1 ≤ |s| ≤ 100000; s chỉ gồm các chữ cái a-z.', 'EASY', 1000, 128, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'string'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, 'level
', 'YES
', TRUE, 1, 1),
            (v_problem_id, 'abca
', 'NO
', TRUE, 1, 2),
            (v_problem_id, 'a
', 'YES
', FALSE, 1, 3),
            (v_problem_id, 'abba
', 'YES
', FALSE, 1, 4),
            (v_problem_id, 'abcba
', 'YES
', FALSE, 1, 5),
            (v_problem_id, 'abcd
', 'NO
', FALSE, 1, 6),
            (v_problem_id, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
', 'YES
', FALSE, 1, 7),
            (v_problem_id, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab
', 'NO
', FALSE, 1, 8);
    END IF;

    -- Ước chung lớn nhất của N số | EASY | math
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-ucln-cua-n-so', 'Ước chung lớn nhất của N số', 'Cho `n` số nguyên không âm, trong đó có ít nhất một số khác `0`. Hãy tính **ước chung lớn nhất (GCD)** của tất cả các số. Gợi ý: `gcd(a, b, c) = gcd(gcd(a, b), c)`.', 'Dòng 1 chứa n. Dòng 2 chứa n số nguyên không âm.', 'In ra ước chung lớn nhất của n số.', '1 ≤ n ≤ 200000; 0 ≤ a[i] ≤ 10^9; tồn tại a[i] > 0.', 'EASY', 1000, 128, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'math'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '3
12 18 30
', '6
', TRUE, 1, 1),
            (v_problem_id, '3
7 11 13
', '1
', TRUE, 1, 2),
            (v_problem_id, '3
0 18 24
', '6
', FALSE, 1, 3),
            (v_problem_id, '3
1000000000 500000000 250000000
', '250000000
', FALSE, 1, 4),
            (v_problem_id, '1
17
', '17
', FALSE, 1, 5),
            (v_problem_id, '3
0 0 12
', '12
', FALSE, 1, 6),
            (v_problem_id, '4
54 24 90 18
', '6
', FALSE, 1, 7),
            (v_problem_id, '3
1001 143 77
', '11
', FALSE, 1, 8);
    END IF;

    -- Tổng đoạn con bằng Prefix Sum | MEDIUM | prefix-sum
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-tong-doan-prefix', 'Tổng đoạn con bằng Prefix Sum', 'Cho mảng `a` gồm `n` số nguyên và `q` truy vấn. Mỗi truy vấn `(l, r)` yêu cầu tính **tổng các phần tử từ vị trí l đến r** (chỉ số bắt đầu từ 1, bao gồm hai đầu). Hãy xử lý các truy vấn hiệu quả bằng tổng tiền tố. Tổng có thể vượt giới hạn số nguyên 32 bit.', 'Dòng 1: n q. Dòng 2: n số nguyên a[i]. q dòng tiếp theo: l r.', 'Với mỗi truy vấn, in tổng đoạn [l, r] trên một dòng.', '1 ≤ n, q ≤ 200000; -10^9 ≤ a[i] ≤ 10^9; 1 ≤ l ≤ r ≤ n. Dùng số nguyên 64 bit.', 'MEDIUM', 1500, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'prefix-sum'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '5 2
1 2 3 4 5
1 3
2 5
', '6
14
', TRUE, 1, 1),
            (v_problem_id, '4 3
-5 10 -3 2
1 4
2 3
4 4
', '4
7
2
', TRUE, 1, 2),
            (v_problem_id, '1 1
0
1 1
', '0
', FALSE, 1, 3),
            (v_problem_id, '4 3
-3 -2 -1 -4
1 4
2 2
3 4
', '-10
-2
-5
', FALSE, 1, 4),
            (v_problem_id, '8 3
1000000000 1000000000 1000000000 1000000000 1000000000 1000000000 1000000000 1000000000
1 8
2 6
8 8
', '8000000000
5000000000
1000000000
', FALSE, 1, 5),
            (v_problem_id, '500 4
1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1 1 -1
1 500
1 499
250 400
251 251
', '0
1
-1
1
', FALSE, 1, 6),
            (v_problem_id, '70 5
131287582 -624918858 -396720564 -251537582 695073217 308137880 -823520379 -275203190 -841608133 -991332294 -611980860 -655763914 -223517012 -247315578 -633437509 -647371404 278204531 -218188496 -154597248 -245981527 -261110964 292836954 934219030 -752198314 -474311413 -121664133 971476941 -833030157 6846651 -830769230 -295416510 -680775894 -802594695 -504938208 458365764 -548879647 -204370970 -994713492 953606567 -245663351 118756778 611956353 851284503 942638016 384106225 -73574622 -945796583 -533136792 -580224395 863158328 324218249 -623911088 -715666032 -435315701 331701607 526756105 799500178 332498286 -204023314 906664840 -197426085 -173854831 -67407034 252194425 419274926 906108804 -13732985 -72866428 -430002487 114639141
1 70
12 39
33 70
1 1
70 70
', '-6744858022
-6435389877
1729330355
131287582
114639141
', FALSE, 1, 7),
            (v_problem_id, '301 4
-150 -149 -148 -147 -146 -145 -144 -143 -142 -141 -140 -139 -138 -137 -136 -135 -134 -133 -132 -131 -130 -129 -128 -127 -126 -125 -124 -123 -122 -121 -120 -119 -118 -117 -116 -115 -114 -113 -112 -111 -110 -109 -108 -107 -106 -105 -104 -103 -102 -101 -100 -99 -98 -97 -96 -95 -94 -93 -92 -91 -90 -89 -88 -87 -86 -85 -84 -83 -82 -81 -80 -79 -78 -77 -76 -75 -74 -73 -72 -71 -70 -69 -68 -67 -66 -65 -64 -63 -62 -61 -60 -59 -58 -57 -56 -55 -54 -53 -52 -51 -50 -49 -48 -47 -46 -45 -44 -43 -42 -41 -40 -39 -38 -37 -36 -35 -34 -33 -32 -31 -30 -29 -28 -27 -26 -25 -24 -23 -22 -21 -20 -19 -18 -17 -16 -15 -14 -13 -12 -11 -10 -9 -8 -7 -6 -5 -4 -3 -2 -1 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150
1 301
151 151
120 220
201 300
', '0
0
1919
9950
', FALSE, 1, 8);
    END IF;

    -- Dãy ngoặc hợp lệ bằng Stack | MEDIUM | stack
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-ngoac-hop-le', 'Dãy ngoặc hợp lệ bằng Stack', 'Cho chuỗi `s` chỉ chứa ba loại ngoặc `()`, `[]`, `{}`. Chuỗi được gọi là **hợp lệ** nếu mỗi ngoặc mở được đóng bởi đúng loại ngoặc và các cặp ngoặc được lồng đúng thứ tự. Hãy dùng ngăn xếp (stack) để kiểm tra.', 'Một dòng chứa chuỗi s gồm ký tự ()[]{}.', 'In YES nếu chuỗi hợp lệ, ngược lại in NO.', '1 ≤ |s| ≤ 200000.', 'MEDIUM', 1000, 128, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'stack'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '([]{})
', 'YES
', TRUE, 1, 1),
            (v_problem_id, '([)]
', 'NO
', TRUE, 1, 2),
            (v_problem_id, '()
', 'YES
', FALSE, 1, 3),
            (v_problem_id, '{[()()]}
', 'YES
', FALSE, 1, 4),
            (v_problem_id, '((
', 'NO
', FALSE, 1, 5),
            (v_problem_id, '])(
', 'NO
', FALSE, 1, 6),
            (v_problem_id, '[({})]{}{([])}
', 'YES
', FALSE, 1, 7),
            (v_problem_id, '(((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))))
', 'NO
', FALSE, 1, 8);
    END IF;

    -- Tìm vị trí đầu tiên bằng Binary Search | MEDIUM | binary-search
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-tim-vi-tri-dau-tien', 'Tìm vị trí đầu tiên bằng Binary Search', 'Cho mảng `a` **đã được sắp xếp không giảm** và `q` truy vấn tìm giá trị `x`. Với mỗi truy vấn, hãy xuất ra **vị trí xuất hiện đầu tiên** của `x` (đánh số từ 1); nếu không tồn tại, xuất `-1`. Cần dùng tìm kiếm nhị phân để đáp ứng giới hạn.', 'Dòng 1: n q. Dòng 2: n số nguyên đã sắp xếp không giảm. Dòng 3 (hoặc nhiều dòng): q số nguyên cần tìm.', 'Với mỗi giá trị cần tìm, in vị trí đầu tiên (1-based) hoặc -1 trên một dòng.', '1 ≤ n, q ≤ 200000; -10^9 ≤ a[i], x ≤ 10^9.', 'MEDIUM', 1500, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'binary-search'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '7 3
-3 -1 -1 0 5 5 7
-1 5 2
', '2
5
-1
', TRUE, 1, 1),
            (v_problem_id, '3 3
1 1 1
1 0 2
', '1
-1
-1
', TRUE, 1, 2),
            (v_problem_id, '1 3
0
0 5 -1
', '1
-1
-1
', FALSE, 1, 3),
            (v_problem_id, '4 3
-100 -100 -3 -1
-100 -1 0
', '1
4
-1
', FALSE, 1, 4),
            (v_problem_id, '150 3
4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4 4
4 3 5
', '1
-1
-1
', FALSE, 1, 5),
            (v_problem_id, '1000 5
0 2 4 6 8 10 12 14 16 18 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48 50 52 54 56 58 60 62 64 66 68 70 72 74 76 78 80 82 84 86 88 90 92 94 96 98 100 102 104 106 108 110 112 114 116 118 120 122 124 126 128 130 132 134 136 138 140 142 144 146 148 150 152 154 156 158 160 162 164 166 168 170 172 174 176 178 180 182 184 186 188 190 192 194 196 198 200 202 204 206 208 210 212 214 216 218 220 222 224 226 228 230 232 234 236 238 240 242 244 246 248 250 252 254 256 258 260 262 264 266 268 270 272 274 276 278 280 282 284 286 288 290 292 294 296 298 300 302 304 306 308 310 312 314 316 318 320 322 324 326 328 330 332 334 336 338 340 342 344 346 348 350 352 354 356 358 360 362 364 366 368 370 372 374 376 378 380 382 384 386 388 390 392 394 396 398 400 402 404 406 408 410 412 414 416 418 420 422 424 426 428 430 432 434 436 438 440 442 444 446 448 450 452 454 456 458 460 462 464 466 468 470 472 474 476 478 480 482 484 486 488 490 492 494 496 498 500 502 504 506 508 510 512 514 516 518 520 522 524 526 528 530 532 534 536 538 540 542 544 546 548 550 552 554 556 558 560 562 564 566 568 570 572 574 576 578 580 582 584 586 588 590 592 594 596 598 600 602 604 606 608 610 612 614 616 618 620 622 624 626 628 630 632 634 636 638 640 642 644 646 648 650 652 654 656 658 660 662 664 666 668 670 672 674 676 678 680 682 684 686 688 690 692 694 696 698 700 702 704 706 708 710 712 714 716 718 720 722 724 726 728 730 732 734 736 738 740 742 744 746 748 750 752 754 756 758 760 762 764 766 768 770 772 774 776 778 780 782 784 786 788 790 792 794 796 798 800 802 804 806 808 810 812 814 816 818 820 822 824 826 828 830 832 834 836 838 840 842 844 846 848 850 852 854 856 858 860 862 864 866 868 870 872 874 876 878 880 882 884 886 888 890 892 894 896 898 900 902 904 906 908 910 912 914 916 918 920 922 924 926 928 930 932 934 936 938 940 942 944 946 948 950 952 954 956 958 960 962 964 966 968 970 972 974 976 978 980 982 984 986 988 990 992 994 996 998 1000 1002 1004 1006 1008 1010 1012 1014 1016 1018 1020 1022 1024 1026 1028 1030 1032 1034 1036 1038 1040 1042 1044 1046 1048 1050 1052 1054 1056 1058 1060 1062 1064 1066 1068 1070 1072 1074 1076 1078 1080 1082 1084 1086 1088 1090 1092 1094 1096 1098 1100 1102 1104 1106 1108 1110 1112 1114 1116 1118 1120 1122 1124 1126 1128 1130 1132 1134 1136 1138 1140 1142 1144 1146 1148 1150 1152 1154 1156 1158 1160 1162 1164 1166 1168 1170 1172 1174 1176 1178 1180 1182 1184 1186 1188 1190 1192 1194 1196 1198 1200 1202 1204 1206 1208 1210 1212 1214 1216 1218 1220 1222 1224 1226 1228 1230 1232 1234 1236 1238 1240 1242 1244 1246 1248 1250 1252 1254 1256 1258 1260 1262 1264 1266 1268 1270 1272 1274 1276 1278 1280 1282 1284 1286 1288 1290 1292 1294 1296 1298 1300 1302 1304 1306 1308 1310 1312 1314 1316 1318 1320 1322 1324 1326 1328 1330 1332 1334 1336 1338 1340 1342 1344 1346 1348 1350 1352 1354 1356 1358 1360 1362 1364 1366 1368 1370 1372 1374 1376 1378 1380 1382 1384 1386 1388 1390 1392 1394 1396 1398 1400 1402 1404 1406 1408 1410 1412 1414 1416 1418 1420 1422 1424 1426 1428 1430 1432 1434 1436 1438 1440 1442 1444 1446 1448 1450 1452 1454 1456 1458 1460 1462 1464 1466 1468 1470 1472 1474 1476 1478 1480 1482 1484 1486 1488 1490 1492 1494 1496 1498 1500 1502 1504 1506 1508 1510 1512 1514 1516 1518 1520 1522 1524 1526 1528 1530 1532 1534 1536 1538 1540 1542 1544 1546 1548 1550 1552 1554 1556 1558 1560 1562 1564 1566 1568 1570 1572 1574 1576 1578 1580 1582 1584 1586 1588 1590 1592 1594 1596 1598 1600 1602 1604 1606 1608 1610 1612 1614 1616 1618 1620 1622 1624 1626 1628 1630 1632 1634 1636 1638 1640 1642 1644 1646 1648 1650 1652 1654 1656 1658 1660 1662 1664 1666 1668 1670 1672 1674 1676 1678 1680 1682 1684 1686 1688 1690 1692 1694 1696 1698 1700 1702 1704 1706 1708 1710 1712 1714 1716 1718 1720 1722 1724 1726 1728 1730 1732 1734 1736 1738 1740 1742 1744 1746 1748 1750 1752 1754 1756 1758 1760 1762 1764 1766 1768 1770 1772 1774 1776 1778 1780 1782 1784 1786 1788 1790 1792 1794 1796 1798 1800 1802 1804 1806 1808 1810 1812 1814 1816 1818 1820 1822 1824 1826 1828 1830 1832 1834 1836 1838 1840 1842 1844 1846 1848 1850 1852 1854 1856 1858 1860 1862 1864 1866 1868 1870 1872 1874 1876 1878 1880 1882 1884 1886 1888 1890 1892 1894 1896 1898 1900 1902 1904 1906 1908 1910 1912 1914 1916 1918 1920 1922 1924 1926 1928 1930 1932 1934 1936 1938 1940 1942 1944 1946 1948 1950 1952 1954 1956 1958 1960 1962 1964 1966 1968 1970 1972 1974 1976 1978 1980 1982 1984 1986 1988 1990 1992 1994 1996 1998
0 1998 1999 1000 123
', '1
1000
-1
501
-1
', FALSE, 1, 6),
            (v_problem_id, '100 6
-30 -29 -29 -29 -28 -26 -26 -24 -24 -23 -23 -22 -22 -20 -19 -18 -16 -16 -15 -15 -15 -14 -14 -11 -11 -11 -11 -10 -9 -8 -7 -7 -6 -5 -5 -5 -4 -1 -1 -1 -1 0 0 0 0 0 1 1 2 3 3 4 4 5 6 6 6 7 7 8 8 8 9 9 10 11 12 12 13 13 14 14 15 15 16 16 17 17 17 18 18 19 19 20 21 21 22 22 24 24 26 26 26 26 27 27 29 29 29 30
-30 -5 0 5 30 99
', '1
34
42
54
100
-1
', FALSE, 1, 7),
            (v_problem_id, '5 4
-1000000000 -1000000000 0 1000000000 1000000000
-1000000000 1000000000 7 0
', '1
4
-1
3
', FALSE, 1, 8);
    END IF;

    -- Chọn số cuộc họp tối đa | MEDIUM | greedy
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-chon-lich-hop', 'Chọn số cuộc họp tối đa', 'Có `n` cuộc họp, cuộc họp thứ `i` diễn ra trong khoảng thời gian **[s[i], e[i])**. Một người chỉ có thể dự các cuộc họp không chồng thời gian. Hai cuộc họp được chọn liên tiếp nếu cuộc sau bắt đầu **không sớm hơn** thời điểm kết thúc cuộc trước. Hãy tìm số cuộc họp tối đa có thể tham dự.', 'Dòng 1 chứa n. n dòng tiếp theo chứa s[i] e[i].', 'Một số nguyên: số cuộc họp tối đa.', '1 ≤ n ≤ 200000; 0 ≤ s[i] < e[i] ≤ 10^9.', 'MEDIUM', 1500, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'greedy'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '5
1 3
2 5
3 4
4 7
5 6
', '3
', TRUE, 1, 1),
            (v_problem_id, '3
0 5
5 10
3 4
', '2
', TRUE, 1, 2),
            (v_problem_id, '1
0 1
', '1
', FALSE, 1, 3),
            (v_problem_id, '4
1 10
2 9
3 8
4 7
', '1
', FALSE, 1, 4),
            (v_problem_id, '5
0 1
1 2
2 3
3 4
4 5
', '5
', FALSE, 1, 5),
            (v_problem_id, '6
0 10
0 3
3 7
7 9
9 11
1 2
', '4
', FALSE, 1, 6),
            (v_problem_id, '100
116 135
491 506
746 767
504 522
620 634
929 968
729 754
817 841
693 697
313 350
690 692
886 895
766 799
309 325
63 91
671 704
267 291
506 544
78 96
961 986
774 779
47 83
313 336
716 731
546 582
652 673
61 78
714 733
207 211
53 92
625 631
542 577
220 248
44 74
36 39
205 223
397 427
826 865
232 253
222 250
170 178
662 667
921 945
519 531
814 822
556 590
703 743
168 198
304 314
923 925
302 334
279 303
177 193
997 1030
713 747
535 542
83 111
773 792
527 534
789 810
841 849
117 143
978 997
570 574
587 610
638 673
948 949
487 504
992 1011
874 906
973 989
276 312
897 928
320 333
214 254
550 573
459 485
542 561
238 270
852 890
193 224
803 826
680 709
984 996
265 280
432 454
873 893
896 916
107 121
660 674
631 650
794 823
237 272
14 36
585 586
956 971
180 190
826 834
251 253
816 851
', '43
', FALSE, 1, 7),
            (v_problem_id, '700
0 1
1 2
2 3
3 4
4 5
5 6
6 7
7 8
8 9
9 10
10 11
11 12
12 13
13 14
14 15
15 16
16 17
17 18
18 19
19 20
20 21
21 22
22 23
23 24
24 25
25 26
26 27
27 28
28 29
29 30
30 31
31 32
32 33
33 34
34 35
35 36
36 37
37 38
38 39
39 40
40 41
41 42
42 43
43 44
44 45
45 46
46 47
47 48
48 49
49 50
50 51
51 52
52 53
53 54
54 55
55 56
56 57
57 58
58 59
59 60
60 61
61 62
62 63
63 64
64 65
65 66
66 67
67 68
68 69
69 70
70 71
71 72
72 73
73 74
74 75
75 76
76 77
77 78
78 79
79 80
80 81
81 82
82 83
83 84
84 85
85 86
86 87
87 88
88 89
89 90
90 91
91 92
92 93
93 94
94 95
95 96
96 97
97 98
98 99
99 100
100 101
101 102
102 103
103 104
104 105
105 106
106 107
107 108
108 109
109 110
110 111
111 112
112 113
113 114
114 115
115 116
116 117
117 118
118 119
119 120
120 121
121 122
122 123
123 124
124 125
125 126
126 127
127 128
128 129
129 130
130 131
131 132
132 133
133 134
134 135
135 136
136 137
137 138
138 139
139 140
140 141
141 142
142 143
143 144
144 145
145 146
146 147
147 148
148 149
149 150
150 151
151 152
152 153
153 154
154 155
155 156
156 157
157 158
158 159
159 160
160 161
161 162
162 163
163 164
164 165
165 166
166 167
167 168
168 169
169 170
170 171
171 172
172 173
173 174
174 175
175 176
176 177
177 178
178 179
179 180
180 181
181 182
182 183
183 184
184 185
185 186
186 187
187 188
188 189
189 190
190 191
191 192
192 193
193 194
194 195
195 196
196 197
197 198
198 199
199 200
200 201
201 202
202 203
203 204
204 205
205 206
206 207
207 208
208 209
209 210
210 211
211 212
212 213
213 214
214 215
215 216
216 217
217 218
218 219
219 220
220 221
221 222
222 223
223 224
224 225
225 226
226 227
227 228
228 229
229 230
230 231
231 232
232 233
233 234
234 235
235 236
236 237
237 238
238 239
239 240
240 241
241 242
242 243
243 244
244 245
245 246
246 247
247 248
248 249
249 250
250 251
251 252
252 253
253 254
254 255
255 256
256 257
257 258
258 259
259 260
260 261
261 262
262 263
263 264
264 265
265 266
266 267
267 268
268 269
269 270
270 271
271 272
272 273
273 274
274 275
275 276
276 277
277 278
278 279
279 280
280 281
281 282
282 283
283 284
284 285
285 286
286 287
287 288
288 289
289 290
290 291
291 292
292 293
293 294
294 295
295 296
296 297
297 298
298 299
299 300
300 301
301 302
302 303
303 304
304 305
305 306
306 307
307 308
308 309
309 310
310 311
311 312
312 313
313 314
314 315
315 316
316 317
317 318
318 319
319 320
320 321
321 322
322 323
323 324
324 325
325 326
326 327
327 328
328 329
329 330
330 331
331 332
332 333
333 334
334 335
335 336
336 337
337 338
338 339
339 340
340 341
341 342
342 343
343 344
344 345
345 346
346 347
347 348
348 349
349 350
350 351
351 352
352 353
353 354
354 355
355 356
356 357
357 358
358 359
359 360
360 361
361 362
362 363
363 364
364 365
365 366
366 367
367 368
368 369
369 370
370 371
371 372
372 373
373 374
374 375
375 376
376 377
377 378
378 379
379 380
380 381
381 382
382 383
383 384
384 385
385 386
386 387
387 388
388 389
389 390
390 391
391 392
392 393
393 394
394 395
395 396
396 397
397 398
398 399
399 400
400 401
401 402
402 403
403 404
404 405
405 406
406 407
407 408
408 409
409 410
410 411
411 412
412 413
413 414
414 415
415 416
416 417
417 418
418 419
419 420
420 421
421 422
422 423
423 424
424 425
425 426
426 427
427 428
428 429
429 430
430 431
431 432
432 433
433 434
434 435
435 436
436 437
437 438
438 439
439 440
440 441
441 442
442 443
443 444
444 445
445 446
446 447
447 448
448 449
449 450
450 451
451 452
452 453
453 454
454 455
455 456
456 457
457 458
458 459
459 460
460 461
461 462
462 463
463 464
464 465
465 466
466 467
467 468
468 469
469 470
470 471
471 472
472 473
473 474
474 475
475 476
476 477
477 478
478 479
479 480
480 481
481 482
482 483
483 484
484 485
485 486
486 487
487 488
488 489
489 490
490 491
491 492
492 493
493 494
494 495
495 496
496 497
497 498
498 499
499 500
500 501
501 502
502 503
503 504
504 505
505 506
506 507
507 508
508 509
509 510
510 511
511 512
512 513
513 514
514 515
515 516
516 517
517 518
518 519
519 520
520 521
521 522
522 523
523 524
524 525
525 526
526 527
527 528
528 529
529 530
530 531
531 532
532 533
533 534
534 535
535 536
536 537
537 538
538 539
539 540
540 541
541 542
542 543
543 544
544 545
545 546
546 547
547 548
548 549
549 550
550 551
551 552
552 553
553 554
554 555
555 556
556 557
557 558
558 559
559 560
560 561
561 562
562 563
563 564
564 565
565 566
566 567
567 568
568 569
569 570
570 571
571 572
572 573
573 574
574 575
575 576
576 577
577 578
578 579
579 580
580 581
581 582
582 583
583 584
584 585
585 586
586 587
587 588
588 589
589 590
590 591
591 592
592 593
593 594
594 595
595 596
596 597
597 598
598 599
599 600
600 601
601 602
602 603
603 604
604 605
605 606
606 607
607 608
608 609
609 610
610 611
611 612
612 613
613 614
614 615
615 616
616 617
617 618
618 619
619 620
620 621
621 622
622 623
623 624
624 625
625 626
626 627
627 628
628 629
629 630
630 631
631 632
632 633
633 634
634 635
635 636
636 637
637 638
638 639
639 640
640 641
641 642
642 643
643 644
644 645
645 646
646 647
647 648
648 649
649 650
650 651
651 652
652 653
653 654
654 655
655 656
656 657
657 658
658 659
659 660
660 661
661 662
662 663
663 664
664 665
665 666
666 667
667 668
668 669
669 670
670 671
671 672
672 673
673 674
674 675
675 676
676 677
677 678
678 679
679 680
680 681
681 682
682 683
683 684
684 685
685 686
686 687
687 688
688 689
689 690
690 691
691 692
692 693
693 694
694 695
695 696
696 697
697 698
698 699
699 700
', '700
', FALSE, 1, 8);
    END IF;

    -- BFS: Đường đi ngắn nhất trên đồ thị | MEDIUM | graph
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-bfs-duong-di-ngan-nhat', 'BFS: Đường đi ngắn nhất trên đồ thị', 'Cho đồ thị **vô hướng, không trọng số** có `n` đỉnh, `m` cạnh và hai đỉnh `s`, `t`. Hãy tìm số cạnh ít nhất trên đường đi từ `s` tới `t`. Nếu không có đường đi, in `-1`. Đồ thị có thể có nhiều thành phần liên thông; nếu `s = t` thì kết quả là `0`.', 'Dòng 1: n m s t. m dòng sau: u v (một cạnh vô hướng).', 'Số cạnh ít nhất từ s đến t; hoặc -1 nếu không có đường đi.', '1 ≤ n ≤ 200000; 0 ≤ m ≤ 300000; 1 ≤ s,t,u,v ≤ n. Không có cạnh tự khép.', 'MEDIUM', 2000, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'graph'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '5 5 1 3
1 2
2 3
1 4
4 5
5 3
', '2
', TRUE, 1, 1),
            (v_problem_id, '4 2 1 4
1 2
3 4
', '-1
', TRUE, 1, 2),
            (v_problem_id, '1 0 1 1
', '0
', FALSE, 1, 3),
            (v_problem_id, '5 4 3 3
1 2
2 3
3 4
4 5
', '0
', FALSE, 1, 4),
            (v_problem_id, '1000 999 1 1000
1 2
2 3
3 4
4 5
5 6
6 7
7 8
8 9
9 10
10 11
11 12
12 13
13 14
14 15
15 16
16 17
17 18
18 19
19 20
20 21
21 22
22 23
23 24
24 25
25 26
26 27
27 28
28 29
29 30
30 31
31 32
32 33
33 34
34 35
35 36
36 37
37 38
38 39
39 40
40 41
41 42
42 43
43 44
44 45
45 46
46 47
47 48
48 49
49 50
50 51
51 52
52 53
53 54
54 55
55 56
56 57
57 58
58 59
59 60
60 61
61 62
62 63
63 64
64 65
65 66
66 67
67 68
68 69
69 70
70 71
71 72
72 73
73 74
74 75
75 76
76 77
77 78
78 79
79 80
80 81
81 82
82 83
83 84
84 85
85 86
86 87
87 88
88 89
89 90
90 91
91 92
92 93
93 94
94 95
95 96
96 97
97 98
98 99
99 100
100 101
101 102
102 103
103 104
104 105
105 106
106 107
107 108
108 109
109 110
110 111
111 112
112 113
113 114
114 115
115 116
116 117
117 118
118 119
119 120
120 121
121 122
122 123
123 124
124 125
125 126
126 127
127 128
128 129
129 130
130 131
131 132
132 133
133 134
134 135
135 136
136 137
137 138
138 139
139 140
140 141
141 142
142 143
143 144
144 145
145 146
146 147
147 148
148 149
149 150
150 151
151 152
152 153
153 154
154 155
155 156
156 157
157 158
158 159
159 160
160 161
161 162
162 163
163 164
164 165
165 166
166 167
167 168
168 169
169 170
170 171
171 172
172 173
173 174
174 175
175 176
176 177
177 178
178 179
179 180
180 181
181 182
182 183
183 184
184 185
185 186
186 187
187 188
188 189
189 190
190 191
191 192
192 193
193 194
194 195
195 196
196 197
197 198
198 199
199 200
200 201
201 202
202 203
203 204
204 205
205 206
206 207
207 208
208 209
209 210
210 211
211 212
212 213
213 214
214 215
215 216
216 217
217 218
218 219
219 220
220 221
221 222
222 223
223 224
224 225
225 226
226 227
227 228
228 229
229 230
230 231
231 232
232 233
233 234
234 235
235 236
236 237
237 238
238 239
239 240
240 241
241 242
242 243
243 244
244 245
245 246
246 247
247 248
248 249
249 250
250 251
251 252
252 253
253 254
254 255
255 256
256 257
257 258
258 259
259 260
260 261
261 262
262 263
263 264
264 265
265 266
266 267
267 268
268 269
269 270
270 271
271 272
272 273
273 274
274 275
275 276
276 277
277 278
278 279
279 280
280 281
281 282
282 283
283 284
284 285
285 286
286 287
287 288
288 289
289 290
290 291
291 292
292 293
293 294
294 295
295 296
296 297
297 298
298 299
299 300
300 301
301 302
302 303
303 304
304 305
305 306
306 307
307 308
308 309
309 310
310 311
311 312
312 313
313 314
314 315
315 316
316 317
317 318
318 319
319 320
320 321
321 322
322 323
323 324
324 325
325 326
326 327
327 328
328 329
329 330
330 331
331 332
332 333
333 334
334 335
335 336
336 337
337 338
338 339
339 340
340 341
341 342
342 343
343 344
344 345
345 346
346 347
347 348
348 349
349 350
350 351
351 352
352 353
353 354
354 355
355 356
356 357
357 358
358 359
359 360
360 361
361 362
362 363
363 364
364 365
365 366
366 367
367 368
368 369
369 370
370 371
371 372
372 373
373 374
374 375
375 376
376 377
377 378
378 379
379 380
380 381
381 382
382 383
383 384
384 385
385 386
386 387
387 388
388 389
389 390
390 391
391 392
392 393
393 394
394 395
395 396
396 397
397 398
398 399
399 400
400 401
401 402
402 403
403 404
404 405
405 406
406 407
407 408
408 409
409 410
410 411
411 412
412 413
413 414
414 415
415 416
416 417
417 418
418 419
419 420
420 421
421 422
422 423
423 424
424 425
425 426
426 427
427 428
428 429
429 430
430 431
431 432
432 433
433 434
434 435
435 436
436 437
437 438
438 439
439 440
440 441
441 442
442 443
443 444
444 445
445 446
446 447
447 448
448 449
449 450
450 451
451 452
452 453
453 454
454 455
455 456
456 457
457 458
458 459
459 460
460 461
461 462
462 463
463 464
464 465
465 466
466 467
467 468
468 469
469 470
470 471
471 472
472 473
473 474
474 475
475 476
476 477
477 478
478 479
479 480
480 481
481 482
482 483
483 484
484 485
485 486
486 487
487 488
488 489
489 490
490 491
491 492
492 493
493 494
494 495
495 496
496 497
497 498
498 499
499 500
500 501
501 502
502 503
503 504
504 505
505 506
506 507
507 508
508 509
509 510
510 511
511 512
512 513
513 514
514 515
515 516
516 517
517 518
518 519
519 520
520 521
521 522
522 523
523 524
524 525
525 526
526 527
527 528
528 529
529 530
530 531
531 532
532 533
533 534
534 535
535 536
536 537
537 538
538 539
539 540
540 541
541 542
542 543
543 544
544 545
545 546
546 547
547 548
548 549
549 550
550 551
551 552
552 553
553 554
554 555
555 556
556 557
557 558
558 559
559 560
560 561
561 562
562 563
563 564
564 565
565 566
566 567
567 568
568 569
569 570
570 571
571 572
572 573
573 574
574 575
575 576
576 577
577 578
578 579
579 580
580 581
581 582
582 583
583 584
584 585
585 586
586 587
587 588
588 589
589 590
590 591
591 592
592 593
593 594
594 595
595 596
596 597
597 598
598 599
599 600
600 601
601 602
602 603
603 604
604 605
605 606
606 607
607 608
608 609
609 610
610 611
611 612
612 613
613 614
614 615
615 616
616 617
617 618
618 619
619 620
620 621
621 622
622 623
623 624
624 625
625 626
626 627
627 628
628 629
629 630
630 631
631 632
632 633
633 634
634 635
635 636
636 637
637 638
638 639
639 640
640 641
641 642
642 643
643 644
644 645
645 646
646 647
647 648
648 649
649 650
650 651
651 652
652 653
653 654
654 655
655 656
656 657
657 658
658 659
659 660
660 661
661 662
662 663
663 664
664 665
665 666
666 667
667 668
668 669
669 670
670 671
671 672
672 673
673 674
674 675
675 676
676 677
677 678
678 679
679 680
680 681
681 682
682 683
683 684
684 685
685 686
686 687
687 688
688 689
689 690
690 691
691 692
692 693
693 694
694 695
695 696
696 697
697 698
698 699
699 700
700 701
701 702
702 703
703 704
704 705
705 706
706 707
707 708
708 709
709 710
710 711
711 712
712 713
713 714
714 715
715 716
716 717
717 718
718 719
719 720
720 721
721 722
722 723
723 724
724 725
725 726
726 727
727 728
728 729
729 730
730 731
731 732
732 733
733 734
734 735
735 736
736 737
737 738
738 739
739 740
740 741
741 742
742 743
743 744
744 745
745 746
746 747
747 748
748 749
749 750
750 751
751 752
752 753
753 754
754 755
755 756
756 757
757 758
758 759
759 760
760 761
761 762
762 763
763 764
764 765
765 766
766 767
767 768
768 769
769 770
770 771
771 772
772 773
773 774
774 775
775 776
776 777
777 778
778 779
779 780
780 781
781 782
782 783
783 784
784 785
785 786
786 787
787 788
788 789
789 790
790 791
791 792
792 793
793 794
794 795
795 796
796 797
797 798
798 799
799 800
800 801
801 802
802 803
803 804
804 805
805 806
806 807
807 808
808 809
809 810
810 811
811 812
812 813
813 814
814 815
815 816
816 817
817 818
818 819
819 820
820 821
821 822
822 823
823 824
824 825
825 826
826 827
827 828
828 829
829 830
830 831
831 832
832 833
833 834
834 835
835 836
836 837
837 838
838 839
839 840
840 841
841 842
842 843
843 844
844 845
845 846
846 847
847 848
848 849
849 850
850 851
851 852
852 853
853 854
854 855
855 856
856 857
857 858
858 859
859 860
860 861
861 862
862 863
863 864
864 865
865 866
866 867
867 868
868 869
869 870
870 871
871 872
872 873
873 874
874 875
875 876
876 877
877 878
878 879
879 880
880 881
881 882
882 883
883 884
884 885
885 886
886 887
887 888
888 889
889 890
890 891
891 892
892 893
893 894
894 895
895 896
896 897
897 898
898 899
899 900
900 901
901 902
902 903
903 904
904 905
905 906
906 907
907 908
908 909
909 910
910 911
911 912
912 913
913 914
914 915
915 916
916 917
917 918
918 919
919 920
920 921
921 922
922 923
923 924
924 925
925 926
926 927
927 928
928 929
929 930
930 931
931 932
932 933
933 934
934 935
935 936
936 937
937 938
938 939
939 940
940 941
941 942
942 943
943 944
944 945
945 946
946 947
947 948
948 949
949 950
950 951
951 952
952 953
953 954
954 955
955 956
956 957
957 958
958 959
959 960
960 961
961 962
962 963
963 964
964 965
965 966
966 967
967 968
968 969
969 970
970 971
971 972
972 973
973 974
974 975
975 976
976 977
977 978
978 979
979 980
980 981
981 982
982 983
983 984
984 985
985 986
986 987
987 988
988 989
989 990
990 991
991 992
992 993
993 994
994 995
995 996
996 997
997 998
998 999
999 1000
', '999
', FALSE, 1, 5),
            (v_problem_id, '100 99 2 100
1 2
1 3
1 4
1 5
1 6
1 7
1 8
1 9
1 10
1 11
1 12
1 13
1 14
1 15
1 16
1 17
1 18
1 19
1 20
1 21
1 22
1 23
1 24
1 25
1 26
1 27
1 28
1 29
1 30
1 31
1 32
1 33
1 34
1 35
1 36
1 37
1 38
1 39
1 40
1 41
1 42
1 43
1 44
1 45
1 46
1 47
1 48
1 49
1 50
1 51
1 52
1 53
1 54
1 55
1 56
1 57
1 58
1 59
1 60
1 61
1 62
1 63
1 64
1 65
1 66
1 67
1 68
1 69
1 70
1 71
1 72
1 73
1 74
1 75
1 76
1 77
1 78
1 79
1 80
1 81
1 82
1 83
1 84
1 85
1 86
1 87
1 88
1 89
1 90
1 91
1 92
1 93
1 94
1 95
1 96
1 97
1 98
1 99
1 100
', '2
', FALSE, 1, 6),
            (v_problem_id, '8 7 1 8
1 2
2 3
3 1
4 5
5 6
6 7
7 8
', '-1
', FALSE, 1, 7),
            (v_problem_id, '6 8 1 4
1 2
2 3
3 4
4 5
5 6
1 6
2 5
3 6
', '3
', FALSE, 1, 8);
    END IF;

    -- Segment Tree: Cập nhật điểm, tìm giá trị nhỏ nhất | HARD | segment-tree
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-segment-tree-rmq', 'Segment Tree: Cập nhật điểm, tìm giá trị nhỏ nhất', 'Cho mảng `a` có `n` số nguyên và `q` thao tác trực tuyến. **Loại 1:** `1 i x` — gán `a[i] = x`. **Loại 2:** `2 l r` — tìm giá trị nhỏ nhất trong đoạn `[l, r]` (bao gồm hai đầu, chỉ số từ 1). Cần trả lời các truy vấn theo đúng thứ tự và hỗ trợ cập nhật hiệu quả.', 'Dòng 1: n q. Dòng 2: n số nguyên. q dòng tiếp theo là 1 i x hoặc 2 l r.', 'Với mỗi thao tác loại 2, in giá trị nhỏ nhất của đoạn cần hỏi trên một dòng.', '1 ≤ n, q ≤ 200000; -10^9 ≤ a[i], x ≤ 10^9; 1 ≤ i ≤ n; 1 ≤ l ≤ r ≤ n.', 'HARD', 2000, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'segment-tree'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '5 4
5 2 7 3 9
2 1 5
1 2 8
2 1 3
2 4 5
', '2
5
3
', TRUE, 1, 1),
            (v_problem_id, '3 3
-4 2 0
2 1 3
1 1 5
2 1 2
', '-4
2
', TRUE, 1, 2),
            (v_problem_id, '1 3
7
2 1 1
1 1 -10
2 1 1
', '7
-10
', FALSE, 1, 3),
            (v_problem_id, '20 5
5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5 5
2 1 20
1 10 -100
2 2 15
1 10 9
2 1 20
', '5
-100
5
', FALSE, 1, 4),
            (v_problem_id, '5 5
1 2 3 4 5
2 2 4
1 1 -9
2 1 1
1 5 -10
2 3 5
', '2
-9
-10
', FALSE, 1, 5),
            (v_problem_id, '3 3
-1000000000 1000000000 0
2 1 3
1 1 1000000000
2 1 3
', '-1000000000
0
', FALSE, 1, 6),
            (v_problem_id, '150 120
-62 627 -297 52 -600 659 796 -479 445 305 543 107 -412 628 -207 756 -868 748 -75 -577 -702 464 -994 -61 -711 -796 -193 -902 541 -360 743 844 750 434 624 -641 -13 999 800 101 -310 -266 -510 -589 721 -867 502 -151 -428 -476 -403 961 -515 -211 -985 -158 857 -704 -355 -104 -153 46 192 -618 -20 -933 -884 282 860 900 245 -968 306 873 771 642 131 -179 -488 -650 845 -319 906 -919 -174 568 585 107 -779 -471 -894 -81 444 -645 106 238 -757 -819 540 -317 405 198 -54 -160 848 449 616 -387 982 261 49 -630 723 -728 -979 133 -904 -339 -367 -22 -579 -73 -336 -707 -164 305 914 997 403 -73 -985 -969 -639 -923 -241 -355 -202 -108 -537 -501 835 -998 527 -657 -263 36 -175 -939 940 972
2 16 102
1 121 989
1 60 146
2 1 105
1 23 -472
1 119 293
2 20 114
1 144 -855
1 148 688
2 32 139
1 39 272
1 116 -871
2 8 110
1 76 23
1 130 -7
2 24 150
1 57 310
1 40 -42
2 18 127
1 69 -444
1 116 654
2 36 143
1 5 380
1 119 -381
2 6 115
1 126 437
1 62 56
2 39 131
1 127 65
1 14 -583
2 20 101
1 77 213
1 105 276
2 30 145
1 87 -505
1 57 -985
2 22 147
1 34 336
1 39 -830
2 7 103
1 76 294
1 55 -906
2 25 136
1 33 -949
1 49 546
2 38 126
1 80 331
1 65 712
2 26 141
1 103 377
1 110 -659
2 38 149
1 7 -364
1 31 848
2 3 112
1 143 457
1 121 -324
2 40 107
1 39 -967
1 31 -492
2 20 114
1 150 -168
1 45 284
2 14 137
1 136 -934
1 125 -274
2 50 143
1 14 -174
1 76 -795
2 2 129
1 95 -387
1 149 515
2 21 145
1 136 442
1 61 -362
2 1 140
1 145 -193
1 64 -176
2 48 122
1 139 -982
1 98 -770
2 22 107
1 99 516
1 34 -468
2 49 130
1 45 -724
1 32 -700
2 39 145
1 70 -882
1 133 -424
2 24 141
1 88 -434
1 92 -65
2 50 136
1 124 -432
1 31 -384
2 44 131
1 146 -402
1 146 953
2 6 105
1 118 509
1 54 -593
2 2 109
1 149 -580
1 100 -264
2 21 145
1 108 520
1 123 703
2 22 119
1 106 -137
1 88 -884
2 14 102
1 45 305
1 10 -745
2 35 128
1 83 -630
1 105 986
2 17 115
1 93 952
1 120 984
', '-994
-994
-985
-985
-985
-998
-985
-998
-985
-985
-985
-998
-998
-985
-985
-985
-985
-998
-985
-985
-985
-985
-998
-985
-998
-985
-985
-985
-985
-998
-985
-985
-985
-985
-985
-998
-985
-985
-985
-985
', FALSE, 1, 7),
            (v_problem_id, '1000 6
1000 999 998 997 996 995 994 993 992 991 990 989 988 987 986 985 984 983 982 981 980 979 978 977 976 975 974 973 972 971 970 969 968 967 966 965 964 963 962 961 960 959 958 957 956 955 954 953 952 951 950 949 948 947 946 945 944 943 942 941 940 939 938 937 936 935 934 933 932 931 930 929 928 927 926 925 924 923 922 921 920 919 918 917 916 915 914 913 912 911 910 909 908 907 906 905 904 903 902 901 900 899 898 897 896 895 894 893 892 891 890 889 888 887 886 885 884 883 882 881 880 879 878 877 876 875 874 873 872 871 870 869 868 867 866 865 864 863 862 861 860 859 858 857 856 855 854 853 852 851 850 849 848 847 846 845 844 843 842 841 840 839 838 837 836 835 834 833 832 831 830 829 828 827 826 825 824 823 822 821 820 819 818 817 816 815 814 813 812 811 810 809 808 807 806 805 804 803 802 801 800 799 798 797 796 795 794 793 792 791 790 789 788 787 786 785 784 783 782 781 780 779 778 777 776 775 774 773 772 771 770 769 768 767 766 765 764 763 762 761 760 759 758 757 756 755 754 753 752 751 750 749 748 747 746 745 744 743 742 741 740 739 738 737 736 735 734 733 732 731 730 729 728 727 726 725 724 723 722 721 720 719 718 717 716 715 714 713 712 711 710 709 708 707 706 705 704 703 702 701 700 699 698 697 696 695 694 693 692 691 690 689 688 687 686 685 684 683 682 681 680 679 678 677 676 675 674 673 672 671 670 669 668 667 666 665 664 663 662 661 660 659 658 657 656 655 654 653 652 651 650 649 648 647 646 645 644 643 642 641 640 639 638 637 636 635 634 633 632 631 630 629 628 627 626 625 624 623 622 621 620 619 618 617 616 615 614 613 612 611 610 609 608 607 606 605 604 603 602 601 600 599 598 597 596 595 594 593 592 591 590 589 588 587 586 585 584 583 582 581 580 579 578 577 576 575 574 573 572 571 570 569 568 567 566 565 564 563 562 561 560 559 558 557 556 555 554 553 552 551 550 549 548 547 546 545 544 543 542 541 540 539 538 537 536 535 534 533 532 531 530 529 528 527 526 525 524 523 522 521 520 519 518 517 516 515 514 513 512 511 510 509 508 507 506 505 504 503 502 501 500 499 498 497 496 495 494 493 492 491 490 489 488 487 486 485 484 483 482 481 480 479 478 477 476 475 474 473 472 471 470 469 468 467 466 465 464 463 462 461 460 459 458 457 456 455 454 453 452 451 450 449 448 447 446 445 444 443 442 441 440 439 438 437 436 435 434 433 432 431 430 429 428 427 426 425 424 423 422 421 420 419 418 417 416 415 414 413 412 411 410 409 408 407 406 405 404 403 402 401 400 399 398 397 396 395 394 393 392 391 390 389 388 387 386 385 384 383 382 381 380 379 378 377 376 375 374 373 372 371 370 369 368 367 366 365 364 363 362 361 360 359 358 357 356 355 354 353 352 351 350 349 348 347 346 345 344 343 342 341 340 339 338 337 336 335 334 333 332 331 330 329 328 327 326 325 324 323 322 321 320 319 318 317 316 315 314 313 312 311 310 309 308 307 306 305 304 303 302 301 300 299 298 297 296 295 294 293 292 291 290 289 288 287 286 285 284 283 282 281 280 279 278 277 276 275 274 273 272 271 270 269 268 267 266 265 264 263 262 261 260 259 258 257 256 255 254 253 252 251 250 249 248 247 246 245 244 243 242 241 240 239 238 237 236 235 234 233 232 231 230 229 228 227 226 225 224 223 222 221 220 219 218 217 216 215 214 213 212 211 210 209 208 207 206 205 204 203 202 201 200 199 198 197 196 195 194 193 192 191 190 189 188 187 186 185 184 183 182 181 180 179 178 177 176 175 174 173 172 171 170 169 168 167 166 165 164 163 162 161 160 159 158 157 156 155 154 153 152 151 150 149 148 147 146 145 144 143 142 141 140 139 138 137 136 135 134 133 132 131 130 129 128 127 126 125 124 123 122 121 120 119 118 117 116 115 114 113 112 111 110 109 108 107 106 105 104 103 102 101 100 99 98 97 96 95 94 93 92 91 90 89 88 87 86 85 84 83 82 81 80 79 78 77 76 75 74 73 72 71 70 69 68 67 66 65 64 63 62 61 60 59 58 57 56 55 54 53 52 51 50 49 48 47 46 45 44 43 42 41 40 39 38 37 36 35 34 33 32 31 30 29 28 27 26 25 24 23 22 21 20 19 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1
2 1 1000
2 1 500
1 1000 999999
2 1 1000
1 1 -5
2 1 1000
', '1
501
2
-5
', FALSE, 1, 8);
    END IF;

    -- Quy hoạch động: Balo 0/1 | HARD | dp
    v_problem_id := NULL;
    INSERT INTO problems(slug, title, statement, input_format, output_format, constraints_text, difficulty, time_limit_ms, memory_limit_mb, visibility, author_id)
    VALUES ('uet-balo-01', 'Quy hoạch động: Balo 0/1', 'Bạn có ba lô với sức chứa `W` và `n` đồ vật. Vật thứ `i` có khối lượng `w[i]` và giá trị `v[i]`. Mỗi vật **chỉ được chọn tối đa một lần**. Hãy tìm tổng giá trị lớn nhất sao cho tổng khối lượng không vượt quá `W`. Có thể không chọn vật nào. Dùng quy hoạch động 0/1 để giải.', 'Dòng 1: n W. n dòng tiếp theo: w[i] v[i].', 'In ra tổng giá trị lớn nhất có thể đạt được.', '1 ≤ n ≤ 100; 0 ≤ W ≤ 2000; 1 ≤ w[i] ≤ 2000; 0 ≤ v[i] ≤ 10^6.', 'HARD', 2500, 256, 'PUBLIC', v_author_id)
    ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_problem_id;
    IF v_problem_id IS NOT NULL THEN
        INSERT INTO problem_tags(problem_id, tag_id)
        SELECT v_problem_id, id FROM tags WHERE slug = 'dp'
        ON CONFLICT DO NOTHING;
        INSERT INTO test_cases(problem_id, input, expected_output, is_sample, weight, order_index)
        VALUES
            (v_problem_id, '4 7
3 4
4 5
2 3
5 7
', '10
', TRUE, 1, 1),
            (v_problem_id, '3 5
4 10
5 11
2 6
', '11
', TRUE, 1, 2),
            (v_problem_id, '2 0
1 100
2 200
', '0
', FALSE, 1, 3),
            (v_problem_id, '2 3
5 10
6 11
', '0
', FALSE, 1, 4),
            (v_problem_id, '3 4
2 3
2 3
3 4
', '6
', FALSE, 1, 5),
            (v_problem_id, '4 5
4 8
3 7
2 6
5 10
', '13
', FALSE, 1, 6),
            (v_problem_id, '50 500
34 521
34 132
15 605
7 393
34 710
4 666
18 902
49 996
25 617
24 860
41 318
47 405
43 782
8 256
46 574
23 366
26 829
34 124
40 969
22 408
38 366
14 940
12 954
46 285
37 600
44 976
14 970
5 604
8 621
4 969
14 898
49 838
36 818
12 224
45 132
27 729
30 789
44 362
32 272
37 959
23 743
41 49
34 294
1 334
31 925
9 385
12 524
9 509
16 502
40 764
', '19853
', FALSE, 1, 7),
            (v_problem_id, '100 2000
1714 517630
1297 704146
543 966507
474 19746
60 225911
117 399374
328 320130
732 970116
60 390023
1511 423497
150 689103
882 547195
1647 896426
242 731881
1082 942021
771 755341
627 890099
1115 820498
140 387088
1075 639342
97 759029
182 242820
368 882504
1344 909141
532 864168
1347 357196
485 182434
1030 620218
321 663663
33 275712
1983 71794
1382 489405
632 570152
1992 612180
708 567757
1564 359947
560 418066
1578 270159
81 449977
86 124257
779 638000
1723 887560
259 399402
642 433421
836 890721
1508 921407
1219 442936
676 432885
176 441236
595 59229
319 930443
1652 241044
639 532375
1842 288521
1876 298484
597 337080
709 348838
1391 761487
586 507337
1553 721041
1004 550737
683 416065
12 82439
852 777612
1211 175964
486 332998
1087 850795
1864 574386
1033 655830
1116 452712
203 598389
1522 741210
550 329185
1567 107932
264 522949
23 435682
504 4077
876 334720
1228 172036
1719 137110
1609 846828
1821 81696
1707 422292
1578 989860
1390 955421
1613 460182
285 20079
1012 123737
407 66623
1857 128284
120 779817
1832 493613
1552 762583
1490 265565
816 963162
250 386297
854 782731
1550 479480
995 386308
273 6696
', '7860219
', FALSE, 1, 8);
    END IF;
END;
$codeuet_practice_seed$;

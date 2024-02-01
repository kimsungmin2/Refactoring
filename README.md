# 환경변수
- .env 파일에 어떤 환경변수가 추가되어야 하는지 작성합니다.
- key=value 형태에서 key만 나열합니다. value는 비밀!

- DB_URL
- JWT_SECRET
- 그 밖의 사용한 환경변수를 나열해 주세요.

# API 명세서 URL
 스웨거 에디터 사용
# ERD URL
- [ERD 작성한 위치 URL 추가](https://www.erdcloud.com/d/sdxbFLSqXiCvyPxd2)
# 더 고민해 보기
1. **암호화 방식**
    - 비밀번호를 DB에 저장할 때 Hash를 이용했는데, Hash는 단방향 암호화와 양방향 암호화 중 어떤 암호화 방식에 해당할까요? 단반향
    - 비밀번호를 그냥 저장하지 않고 Hash 한 값을 저장 했을 때의 좋은 점은 무엇인가요? 해싱을 하지 않으면 취약점이 많아짐

2. **인증 방식**
    - JWT(Json Web Token)을 이용해 인증 기능을 했는데, 만약 Access Token이 노출되었을 경우 발생할 수 있는 문제점은 무엇일까요? 개인정보 탈취
    - 해당 문제점을 보완하기 위한 방법으로는 어떤 것이 있을까요? 유효시간을 줌

3. **인증과 인가**
    - 인증과 인가가 무엇인지 각각 설명해 주세요. 인증(Authentication)은 서비스를 이용하려는 사용자가 인증된 신분을 가진 사람이 맞는지 검증하는 작업을 뜻합니다. 일반적으로, 신분증 검사 작업에 해당합니다.
    - 인가(Authorization)는 이미 인증된 사용자가 특정 리소스에 접근하거나 특정 작업을 수행할 수 있는 권한이 있는지를 검증하는 작업을 뜻합니다. 놀이공원에서 자유 이용권을 소지하고있는지 확인하는 단계라고 보면 좋습니다.
    - 과제에서 구현한 Middleware는 인증에 해당하나요? 인가에 해당하나요? 그 이유도 알려주세요. 인증에 해당합니다. 발급된 토큰을 대조하여 내가 생성한 토큰이 맞는지 확인 하는 과정을 거치기 떄문입니다.

4. **Http Status Code**
    - 과제를 진행하면서 사용한 Http Status Code를 모두 나열하고, 각각이 의미하는 것과 어떤 상황에 사용했는지 작성해 주세요.
      200 : 정상적으로 응답 201 : 정상적으로 생성 401 : 인증이 되지 않음 403 : 권한이 없음 404 : 페이지가 로드 되지 않음 409 : 입력한 정보가 충돌
5. **리팩토링**
    - MySQL, Prisma로 개발했는데 MySQL을 MongoDB로 혹은 Prisma 를 TypeORM 로 변경하게 된다면 많은 코드 변경이 필요할까요? 주로 어떤 코드에서 변경이 필요한가요? 주로 orm, db를 불러오거나 내보낼 때 명령어를 수정하면 될 거 같습니다
		- 만약 이렇게 DB를 변경하는 경우가 또 발생했을 때, 코드 변경을 보다 쉽게 하려면 어떻게 코드를 작성하면 좋을 지 생각나는 방식이 있나요? 있다면 작성해 주세요. 각 기능별로 나누고 기능에 주석처리

6. **API 명세서**
    - notion 혹은 엑셀에 작성하여 전달하는 것 보다 swagger 를 통해 전달하면 장점은 무엇일까요?
      노션 혹은 엑셀에 작성하면 단편적으로 보이지만 스웨거를 사용하면 더미데이터를 넣어서 원활히 돌아가는지 확인 가능

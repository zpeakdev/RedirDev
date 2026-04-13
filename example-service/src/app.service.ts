import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      code: 200,
      msg: '获取文章成功1',
      total: 6,
      currentPage: '1',
      pageSize: '10',
      data: [
        {
          article_id: 72,
          article_title: '我是peak22',
          article_digest: 'hh哈哈哈哈',
          article_content: '啊实打实大',
          article_cover: '',
          cate_id: 15,
          views: 0,
          status: 2,
          noPass_reason: null,
          article_type: 1,
          article_views: null,
          comment_status: 1,
          create_by: '那一道似有似无的墙啊',
          create_id: 27,
          create_time: '2024-09-08 21:21:45',
          update_by: '那一道似有似无的墙啊',
          update_id: 27,
          update_time: '2024-09-08 21:21:45',
          category: {
            cate_id: 15,
            cate_name: '前端',
          },
          tags: [
            {
              tag_id: 10,
              tag_name: 'NodeJS',
            },
          ],
          like_count: 0,
          user_liked: 0,
          comment_count: 0,
        }
      ],
    };
  }
}

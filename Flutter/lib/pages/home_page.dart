import 'package:flutter/material.dart';
import 'package:navtalk_flutter_sample/pages/navtalk_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: ()=>{
            Navigator.push(context, MaterialPageRoute(builder: (context) => NavTalkPage()))
          },
          child: const Text('Go To NavTalk'),
        ),
      ),
    );
  }
}